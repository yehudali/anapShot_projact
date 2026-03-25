import asyncio
import json
import logging

from app.config import Settings
from app.services.database import devices_collection

settings = Settings()
log = logging.getLogger(__name__)


def _send_one(subscription: dict, payload: str, private_key: str, claims: dict) -> None:
    """Synchronous Web Push send — runs in a thread via asyncio.to_thread."""
    from pywebpush import webpush, WebPushException
    from py_vapid import Vapid

    vapid = Vapid.from_string(private_key)
    webpush(
        subscription_info=subscription,
        data=payload,
        vapid_private_key=vapid,
        vapid_claims=claims,
    )


async def send_event_notification(event_id: str, event_name: str) -> None:
    """Send Web Push to all active devices that have a push subscription."""
    if not settings.vapid_private_key or not settings.vapid_claims_email:
        log.info("VAPID not configured — skipping push notifications")
        return

    payload = json.dumps({"event_id": event_id, "event_name": event_name})
    claims = {"sub": f"mailto:{settings.vapid_claims_email}"}

    async for device in devices_collection.find(
        {"state": "active", "push_subscription": {"$exists": True, "$ne": None}}
    ):
        sub = device.get("push_subscription")
        if not sub:
            continue
        device_id = str(device["_id"])
        try:
            await asyncio.to_thread(
                _send_one, sub, payload, settings.vapid_private_key, claims
            )
            log.info(f"Push sent to device {device_id}")
        except Exception as exc:
            log.warning(f"Push failed for device {device_id}: {exc}")
