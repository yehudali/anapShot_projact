import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import Settings
from app.routes import events_router, devices_router, locations_router, users_router, ws_router, auth_router
from app.services.watchdog import run_watchdog

log = logging.getLogger(__name__)
settings = Settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    watchdog_task = asyncio.create_task(run_watchdog())
    yield
    watchdog_task.cancel()
    try:
        await watchdog_task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="anapshot-backend", lifespan=lifespan)

app.include_router(events_router, prefix="/api/v1", tags=["events"])
app.include_router(devices_router, prefix="/api/v1", tags=["devices"])
app.include_router(locations_router, prefix="/api/v1", tags=["locations"])
app.include_router(users_router, prefix="/api/v1", tags=["users"])
app.include_router(ws_router, prefix="/ws", tags=["websocket"])
app.include_router(auth_router, prefix="/api/v1", tags=["auth"])
app.mount("/device-app", StaticFiles(directory="device-app", html=True), name="device-app")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "anapshot-backend"}
