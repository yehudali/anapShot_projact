from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.database import users_collection
from app.core.auth import create_access_token, pwd_ctx

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/auth/login", response_model=dict)
async def login(body: LoginRequest):
    user = await users_collection.find_one({"username": body.username})
    if not user or not pwd_ctx.verify(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user["_id"]), "role": user["role"]})
    return {"status": "success", "data": {"token": token, "role": user["role"]}}
