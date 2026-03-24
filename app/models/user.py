from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class Role(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    DEVICE = "device"

class User(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    username: str
    hashed_password: str
    role: Role
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }