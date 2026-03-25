from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class EventStatus(str, Enum):
    ACTIVE = "active"
    CLOSED = "closed"

class Event(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    description: Optional[str] = None
    created_by: str = ""
    status: EventStatus = EventStatus.ACTIVE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    closed_at: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }