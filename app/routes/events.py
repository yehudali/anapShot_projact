from fastapi import APIRouter, Depends, HTTPException
from app.models import Event, EventStatus
from app.services.database import events_collection, redis_client
from app.services.kafka_service import send_wakeup_message
from app.core.auth import require_role
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional

router = APIRouter()


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


def _valid_oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")


@router.post("/events", response_model=dict)
async def create_event(event: Event, user: dict = Depends(require_role("admin"))):
    event.created_by = user.get("sub", "admin")
    event_dict = event.model_dump(by_alias=True, exclude_none=True)
    event_dict["_id"] = ObjectId()

    result = await events_collection.insert_one(event_dict)
    event_id = str(result.inserted_id)

    await send_wakeup_message(event_id)

    return {"status": "success", "data": {"event_id": event_id}, "message": "Event created and devices notified"}


@router.get("/events", response_model=dict)
async def list_events(status: Optional[EventStatus] = None, _=Depends(require_role("admin", "manager"))):
    query = {}
    if status:
        query["status"] = status.value
    cursor = events_collection.find(query)
    events = [_serialize(e) async for e in cursor]
    return {"status": "success", "data": events}


@router.get("/events/{event_id}", response_model=dict)
async def get_event(event_id: str, _=Depends(require_role("admin", "manager"))):
    event = await events_collection.find_one({"_id": _valid_oid(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"status": "success", "data": _serialize(event)}


@router.put("/events/{event_id}/close", response_model=dict)
async def close_event(event_id: str, _=Depends(require_role("admin"))):
    result = await events_collection.update_one(
        {"_id": _valid_oid(event_id)},
        {"$set": {"status": EventStatus.CLOSED.value, "closed_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    await redis_client.delete(f"event:{event_id}")
    return {"status": "success", "message": "Event closed"}