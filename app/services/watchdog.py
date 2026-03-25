import asyncio
import logging

from app.services.database import devices_collection, redis_client

log = logging.getLogger(__name__)

WATCHDOG_INTERVAL = 30  # seconds between checks


async def _check_devices():
    try:
        async for device in devices_collection.find({"state": "active"}):
            device_id = str(device["_id"])
            if not await redis_client.exists(f"device:alive:{device_id}"):
                await devices_collection.update_one(
                    {"_id": device["_id"]},
                    {"$set": {"state": "unreachable"}}
                )
                log.info(f"Watchdog: device {device_id} marked UNREACHABLE")

        async for device in devices_collection.find({"state": "unreachable"}):
            device_id = str(device["_id"])
            if await redis_client.exists(f"device:alive:{device_id}"):
                await devices_collection.update_one(
                    {"_id": device["_id"]},
                    {"$set": {"state": "active"}}
                )
                log.info(f"Watchdog: device {device_id} marked ACTIVE (recovered)")

    except Exception as exc:
        log.error(f"Watchdog error: {exc}")


async def run_watchdog():
    log.info("Watchdog started")
    while True:
        await asyncio.sleep(WATCHDOG_INTERVAL)
        await _check_devices()
