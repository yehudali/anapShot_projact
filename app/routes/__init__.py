from .events import router as events_router
from .devices import router as devices_router
from .locations import router as locations_router
from .users import router as users_router

__all__ = ["events_router", "devices_router", "locations_router", "users_router"]
