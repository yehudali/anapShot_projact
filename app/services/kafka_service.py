from aiokafka import AIOKafkaProducer
from app.config import Settings

settings = Settings()

_producer: AIOKafkaProducer | None = None


async def get_producer() -> AIOKafkaProducer:
    global _producer
    if _producer is None:
        p = AIOKafkaProducer(bootstrap_servers=settings.kafka_bootstrap_servers)
        await p.start()
        _producer = p
    return _producer  # type: ignore[return-value]


async def send_wakeup_message(event_id: str):
    p = await get_producer()
    import json
    message = json.dumps({"event_id": event_id}).encode("utf-8")
    await p.send_and_wait("device.wakeup", message)