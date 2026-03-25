import asyncio
import json

from bson import ObjectId
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.auth import decode_token
from app.services.database import events_collection, redis_client

router = APIRouter()

STREAM_INTERVAL = 2  # seconds between location pushes


def _valid_oid(id_str: str) -> ObjectId | None:
    try:
        return ObjectId(id_str)
    except Exception:
        return None


async def _get_locations(event_id: str) -> list:
    raw = await redis_client.hgetall(f"event:{event_id}")
    return [json.loads(v) for v in raw.values()]


@router.websocket("/events/{event_id}")
async def stream_locations(websocket: WebSocket, event_id: str, token: str = Query(...)):
    await websocket.accept()

    try:
        payload = decode_token(token)
        if payload.get("role") not in ("admin", "manager"):
            await websocket.close(code=1008)
            return
    except Exception:
        await websocket.close(code=1008)
        return

    oid = _valid_oid(event_id)
    if oid is None:
        await websocket.close(code=1008)
        return

    event = await events_collection.find_one({"_id": oid})
    if not event:
        await websocket.close(code=1008)
        return

    try:
        while True:
            locations = await _get_locations(event_id)

            # Refresh event status
            event = await events_collection.find_one({"_id": oid}, {"status": 1})
            status = event.get("status", "active") if event else "closed"

            await websocket.send_json({"status": status, "locations": locations})

            if status == "closed":
                break

            await asyncio.sleep(STREAM_INTERVAL)

    except WebSocketDisconnect:
        pass
