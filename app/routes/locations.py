from fastapi import APIRouter, Depends
from app.services.database import redis_client, locations_collection
from app.core.auth import require_role
import json

router = APIRouter()


@router.get("/events/{event_id}/locations", response_model=dict)
async def get_event_locations(event_id: str, _=Depends(require_role("admin", "manager"))):
    locations_raw = await redis_client.hgetall(f"event:{event_id}")
    locations = [json.loads(v) for v in locations_raw.values()]
    return {"status": "success", "locations": locations}


@router.get("/events/{event_id}/history", response_model=dict)
async def get_event_history(
    event_id: str,
    page: int = 1,
    limit: int = 50,
    _=Depends(require_role("admin", "manager")),
):
    skip = (page - 1) * limit
    cursor = locations_collection.find({"event_id": event_id}, {"_id": 0}).skip(skip).limit(limit)
    history = [doc async for doc in cursor]
    return {"status": "success", "data": history, "page": page, "limit": limit}
