import json
import logging

from app.config import Settings

settings = Settings()
log = logging.getLogger(__name__)

_producer = None


async def send_wakeup_message(event_id: str) -> None:
    """Publish wake-up message to Kafka. No-op if Kafka is not configured."""
    if not settings.kafka_bootstrap_servers:
        log.info("Kafka not configured — skipping wakeup message")
        return

    try:
        from aiokafka import AIOKafkaProducer

        global _producer
        if _producer is None:
            p = AIOKafkaProducer(bootstrap_servers=settings.kafka_bootstrap_servers)
            await p.start()
            _producer = p

        message = json.dumps({"event_id": event_id}).encode("utf-8")
        await _producer.send_and_wait("device.wakeup", message)
    except Exception as exc:
        log.warning(f"Kafka wakeup failed (non-fatal): {exc}")