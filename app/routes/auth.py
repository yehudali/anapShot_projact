from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timezone
from app.services.database import users_collection
from app.core.auth import create_access_token, pwd_ctx
from app.config import Settings

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class BootstrapRequest(BaseModel):
    username: str
    password: str


@router.post("/auth/login", response_model=dict)
async def login(body: LoginRequest):
    user = await users_collection.find_one({"username": body.username})
    if not user or not pwd_ctx.verify(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user["_id"]), "role": user["role"]})
    return {"status": "success", "data": {"token": token, "role": user["role"]}}


@router.post("/auth/bootstrap", response_model=dict)
async def bootstrap(body: BootstrapRequest):
    count = await users_collection.count_documents({})
    if count > 0:
        raise HTTPException(status_code=409, detail="Bootstrap not allowed: users already exist")

    settings = Settings()
    now = datetime.now(timezone.utc)

    admin_doc = {
        "_id": ObjectId(),
        "username": body.username,
        "hashed_password": pwd_ctx.hash(body.password),
        "role": "admin",
        "created_at": now,
    }
    consumer_doc = {
        "_id": ObjectId(),
        "username": settings.consumer_username,
        "hashed_password": pwd_ctx.hash(settings.consumer_password),
        "role": "manager",
        "created_at": now,
    }
    await users_collection.insert_many([admin_doc, consumer_doc])
    token = create_access_token({"sub": str(admin_doc["_id"]), "role": "admin"})
    return {"status": "success", "data": {"token": token, "role": "admin"}}
