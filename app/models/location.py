from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class Location(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    device_id: str
    event_id: str
    latitude: float
    longitude: float
    timestamp: datetime
    accuracy: float

    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }