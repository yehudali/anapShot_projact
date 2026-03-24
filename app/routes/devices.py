from fastapi import APIRouter, HTTPException
from app.models import DeviceState, Location
from app.services.database import devices_collection, locations_collection, redis_client
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional
import json

router = APIRouter()


class DeviceCreate(BaseModel):
    name: str
    user_id: str
    state: DeviceState = DeviceState.ACTIVE


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    state: Optional[DeviceState] = None


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


def _valid_oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")


# --- Device CRUD ---

@router.get("/devices", response_model=dict)
async def list_devices(state: Optional[DeviceState] = None):
    query = {}
    if state:
        query["state"] = state.value
    cursor = devices_collection.find(query)
    devices = [_serialize(d) async for d in cursor]
    return {"status": "success", "data": devices}


@router.post("/devices", response_model=dict)
async def create_device(body: DeviceCreate):
    doc = body.model_dump()
    doc["_id"] = ObjectId()
    from datetime import datetime, timezone
    doc["created_at"] = datetime.now(timezone.utc)
    await devices_collection.insert_one(doc)
    return {"status": "success", "data": {"id": str(doc["_id"])}}


@router.get("/devices/{device_id}", response_model=dict)
async def get_device(device_id: str):
    device = await devices_collection.find_one({"_id": _valid_oid(device_id)})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"status": "success", "data": _serialize(device)}


@router.put("/devices/{device_id}", response_model=dict)
async def update_device(device_id: str, body: DeviceUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await devices_collection.update_one(
        {"_id": _valid_oid(device_id)}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"status": "success", "message": "Device updated"}


@router.delete("/devices/{device_id}", response_model=dict)
async def delete_device(device_id: str):
    result = await devices_collection.delete_one({"_id": _valid_oid(device_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"status": "success", "message": "Device deleted"}


# --- Location reporting (existing) ---

@router.post("/devices/{device_id}/location", response_model=dict)
async def report_location(device_id: str, location: Location):
    device = await devices_collection.find_one({"_id": _valid_oid(device_id)})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    if device.get("state") != "active":
        raise HTTPException(status_code=400, detail="Device is not active")

    location_dict = location.model_dump(by_alias=True, exclude_unset=True)
    location_dict["_id"] = ObjectId()
    await locations_collection.insert_one(location_dict)

    redis_key = f"event:{location.event_id}"
    location_data = {
        "device_id": device_id,
        "latitude": location.latitude,
        "longitude": location.longitude,
        "timestamp": location.timestamp.isoformat(),
        "accuracy": location.accuracy,
    }
    await redis_client.sadd(redis_key, json.dumps(location_data))

    return {"status": "success", "message": "Location reported"}