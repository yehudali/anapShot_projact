from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class DeviceState(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    UNREACHABLE = "unreachable"

class Device(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    state: DeviceState = DeviceState.ACTIVE
    user_id: str  # who owns this device
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_seen: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }