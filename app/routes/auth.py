from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timezone
from app.services.database import users_collection
from app.core.auth import create_access_token, pwd_ctx

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

    doc = {
        "_id": ObjectId(),
        "username": body.username,
        "hashed_password": pwd_ctx.hash(body.password),
        "role": "admin",
        "created_at": datetime.now(timezone.utc),
    }
    await users_collection.insert_one(doc)
    token = create_access_token({"sub": str(doc["_id"]), "role": "admin"})
    return {"status": "success", "data": {"token": token, "role": "admin"}}
