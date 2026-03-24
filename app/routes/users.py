from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import require_role
from app.models import Role
from app.services.database import users_collection
from bson import ObjectId
from pydantic import BaseModel
from datetime import datetime, timezone
from passlib.context import CryptContext

router = APIRouter()

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserCreate(BaseModel):
    username: str
    password: str
    role: Role


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    doc.pop("hashed_password", None)
    return doc


def _valid_oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")


@router.post("/users/bootstrap", response_model=dict)
async def bootstrap_admin(body: UserCreate):
    """Create the first admin user — only works when no users exist."""
    count = await users_collection.count_documents({})
    if count > 0:
        raise HTTPException(status_code=403, detail="Bootstrap not allowed: users already exist")
    body.role = Role.ADMIN
    existing = await users_collection.find_one({"username": body.username})
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")
    doc = {
        "_id": ObjectId(),
        "username": body.username,
        "hashed_password": _pwd_ctx.hash(body.password),
        "role": Role.ADMIN.value,
        "created_at": datetime.now(timezone.utc),
    }
    await users_collection.insert_one(doc)
    return {"status": "success", "data": {"id": str(doc["_id"]), "username": doc["username"], "role": doc["role"]}}


@router.post("/users", response_model=dict)
async def create_user(body: UserCreate, _=Depends(require_role("admin"))):
    existing = await users_collection.find_one({"username": body.username})
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    doc = {
        "_id": ObjectId(),
        "username": body.username,
        "hashed_password": _pwd_ctx.hash(body.password),
        "role": body.role.value,
        "created_at": datetime.now(timezone.utc),
    }
    await users_collection.insert_one(doc)
    return {"status": "success", "data": {"id": str(doc["_id"]), "username": doc["username"], "role": doc["role"]}}


@router.get("/users", response_model=dict)
async def list_users(_=Depends(require_role("admin"))):
    cursor = users_collection.find({})
    users = [_serialize(u) async for u in cursor]
    return {"status": "success", "data": users}


@router.get("/users/{user_id}", response_model=dict)
async def get_user(user_id: str, _=Depends(require_role("admin"))):
    user = await users_collection.find_one({"_id": _valid_oid(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "data": _serialize(user)}
