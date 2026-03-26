from fastapi import APIRouter, Depends, Header, HTTPException
from app.models import DeviceState, Location
from app.services.database import devices_collection, locations_collection, redis_client
from app.core.auth import require_role
from app.config import Settings
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional
from uuid import uuid4
from datetime import datetime, timezone
import json

settings = Settings()

router = APIRouter()


class DeviceCreate(BaseModel):
    name: str
    user_id: Optional[str] = None
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
async def list_devices(state: Optional[DeviceState] = None, _=Depends(require_role("admin", "manager"))):
    query = {}
    if state:
        query["state"] = state.value
    cursor = devices_collection.find(query)
    devices = [_serialize(d) async for d in cursor]
    return {"status": "success", "data": devices}


@router.post("/devices", response_model=dict)
async def create_device(body: DeviceCreate, _=Depends(require_role("admin"))):
    doc = {k: v.value if hasattr(v, "value") else v for k, v in body.model_dump().items()}
    doc["_id"] = ObjectId()
    doc["api_key"] = str(uuid4())
    doc["created_at"] = datetime.now(timezone.utc)
    await devices_collection.insert_one(doc)
    return {"status": "success", "data": {"id": str(doc["_id"]), "api_key": doc["api_key"]}}


@router.get("/devices/{device_id}", response_model=dict)
async def get_device(device_id: str, _=Depends(require_role("admin", "manager"))):
    device = await devices_collection.find_one({"_id": _valid_oid(device_id)})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"status": "success", "data": _serialize(device)}


@router.put("/devices/{device_id}", response_model=dict)
async def update_device(device_id: str, body: DeviceUpdate, _=Depends(require_role("admin"))):
    updates = {k: v.value if hasattr(v, "value") else v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await devices_collection.update_one(
        {"_id": _valid_oid(device_id)}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"status": "success", "message": "Device updated"}


@router.delete("/devices/{device_id}", response_model=dict)
async def delete_device(device_id: str, _=Depends(require_role("admin"))):
    result = await devices_collection.delete_one({"_id": _valid_oid(device_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"status": "success", "message": "Device deleted"}


# --- VAPID public key (no auth — needed by device PWA before setup) ---

@router.get("/vapid-public-key", response_model=dict)
async def get_vapid_public_key():
    """Return the VAPID public key so the device PWA can subscribe to Web Push."""
    return {"status": "success", "data": {"public_key": settings.vapid_public_key or ""}}


# --- Device credential validation (used by PWA setup screen) ---

@router.get("/devices/{device_id}/validate", response_model=dict)
async def validate_device(device_id: str, x_api_key: str = Header(...)):
    """Validate device_id + API key. Returns 200 on success, 401/404 on failure."""
    device = await devices_collection.find_one({"_id": _valid_oid(device_id)})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    if device.get("api_key") != x_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return {"status": "success", "data": {"name": device.get("name", ""), "state": device.get("state", "")}}


# --- Push subscription registration ---

@router.put("/devices/{device_id}/push-subscription", response_model=dict)
async def register_push_subscription(
    device_id: str,
    body: dict,
    x_api_key: str = Header(...),
):
    """Store a Web Push subscription for this device. Auth via X-Api-Key."""
    device = await devices_collection.find_one({"_id": _valid_oid(device_id)})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    if device.get("api_key") != x_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    await devices_collection.update_one(
        {"_id": _valid_oid(device_id)},
        {"$set": {"push_subscription": body}},
    )
    return {"status": "success", "message": "Push subscription registered"}


# --- Location reporting (existing) ---

@router.post("/devices/{device_id}/location", response_model=dict)
async def report_location(device_id: str, location: Location, x_api_key: str = Header(...)):
    device = await devices_collection.find_one({"_id": _valid_oid(device_id)})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    if device.get("api_key") != x_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    device_state = device.get("state")
    if device_state not in ("active", "unreachable"):
        raise HTTPException(status_code=400, detail="Device is not active")

    location_dict = location.model_dump(by_alias=True, exclude_unset=True)
    location_dict["_id"] = ObjectId()
    await locations_collection.insert_one(location_dict)

    redis_key = f"event:{location.event_id}"
    location_data = {
        "device_id": device_id,
        "device_name": device.get("name", device_id),
        "state": "active",
        "latitude": location.latitude,
        "longitude": location.longitude,
        "timestamp": location.timestamp.isoformat(),
        "accuracy": location.accuracy,
    }
    await redis_client.hset(redis_key, device_id, json.dumps(location_data))
    await redis_client.setex(f"device:alive:{device_id}", 45, "1")

    db_updates: dict = {"last_seen": datetime.now(timezone.utc)}
    if device_state == "unreachable":
        db_updates["state"] = "active"
    await devices_collection.update_one(
        {"_id": _valid_oid(device_id)},
        {"$set": db_updates}
    )

    return {"status": "success", "message": "Location reported"}