import asyncio
import json
import logging
import os
import random
from datetime import datetime, timezone

import httpx
from aiokafka import AIOKafkaConsumer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
FASTAPI_URL = os.getenv("FASTAPI_URL", "http://localhost:8000")
CONSUMER_USERNAME = os.getenv("CONSUMER_USERNAME", "")
CONSUMER_PASSWORD = os.getenv("CONSUMER_PASSWORD", "")
MONGO_DB = os.getenv("MONGO_DB", "mongodb://localhost:27017/consumer_db")  # For potential future use
LOCATION_INTERVAL = 5  # seconds between location reports

# Base coordinates (Israel center)
BASE_LAT = 31.5
BASE_LON = 34.8


def _simulate_location(base_lat: float, base_lon: float) -> dict:
    """Return a slightly drifted coordinate from the base point."""
    return {
        "latitude": base_lat + random.uniform(-0.005, 0.005),
        "longitude": base_lon + random.uniform(-0.005, 0.005),
        "accuracy": round(random.uniform(3.0, 15.0), 1),
    }


async def _login(client: httpx.AsyncClient) -> str:
    """Login to FastAPI and return a Bearer token."""
    resp = await client.post(
        f"{FASTAPI_URL}/api/v1/auth/login",
        json={"username": CONSUMER_USERNAME, "password": CONSUMER_PASSWORD},
    )
    resp.raise_for_status()
    return resp.json()["data"]["token"]


async def report_device_location(
    client: httpx.AsyncClient,
    device_id: str,
    api_key: str,
    event_id: str,
    auth_headers: dict,
):
    """Periodically report location for a single device until the event closes."""
    log.info(f"Device {device_id}: starting location reporting for event {event_id}")
    while True:
        try:
            # Check if event is still active
            resp = await client.get(
                f"{FASTAPI_URL}/api/v1/events/{event_id}",
                headers=auth_headers,
            )
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                if data.get("status") == "closed":
                    log.info(f"Device {device_id}: event {event_id} closed, stopping")
                    break

            # Report location
            location = _simulate_location(BASE_LAT, BASE_LON)
            location["device_id"] = device_id
            location["event_id"] = event_id
            location["timestamp"] = datetime.now(timezone.utc).isoformat()

            await client.post(
                f"{FASTAPI_URL}/api/v1/devices/{device_id}/location",
                json=location,
                headers={"X-Api-Key": api_key},
            )
        except Exception as exc:
            log.warning(f"Device {device_id}: error reporting location — {exc}")

        await asyncio.sleep(LOCATION_INTERVAL)


async def handle_wakeup(event_id: str):
    """Fetch all active devices and start location reporting tasks."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            token = await _login(client)
        except Exception as exc:
            log.error(f"Consumer login failed: {exc}")
            return

        auth_headers = {"Authorization": f"Bearer {token}"}

        try:
            resp = await client.get(
                f"{FASTAPI_URL}/api/v1/devices",
                params={"state": "active"},
                headers=auth_headers,
            )
            resp.raise_for_status()
        except Exception as exc:
            log.error(f"Failed to fetch active devices: {exc}")
            return

        devices = resp.json().get("data", [])
        if not devices:
            log.warning(f"No active devices found for event {event_id}")
            return

        log.info(f"Waking up {len(devices)} device(s) for event {event_id}")
        tasks = [
            asyncio.create_task(
                report_device_location(client, d["id"], d.get("api_key", ""), event_id, auth_headers)
            )
            for d in devices
        ]
        await asyncio.gather(*tasks)


async def consume():
    consumer = AIOKafkaConsumer(
        "device.wakeup",
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id="device-wakeup-consumer",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        auto_offset_reset="earliest",
    )

    log.info(f"Connecting to Kafka at {KAFKA_BOOTSTRAP_SERVERS}...")
    await consumer.start()
    log.info("Consumer started, waiting for messages...")

    try:
        async for msg in consumer:
            event_id = msg.value.get("event_id")
            if not event_id:
                log.warning(f"Received malformed message: {msg.value}")
                continue
            log.info(f"Received wakeup for event {event_id}")
            asyncio.create_task(handle_wakeup(event_id))
    finally:
        await consumer.stop()


if __name__ == "__main__":
    asyncio.run(consume())
