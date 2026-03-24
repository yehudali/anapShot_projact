from fastapi import APIRouter, HTTPException
from app.services.database import redis_client
import json

router = APIRouter()

@router.get("/events/{event_id}/locations")
async def get_event_locations(event_id: str):
    redis_key = f"event:{event_id}"
    locations_data = await redis_client.smembers(redis_key)

    locations = []
    for loc_json in locations_data:
        loc_dict = json.loads(loc_json)
        locations.append(loc_dict)

    return {"status": "success", "locations": locations}