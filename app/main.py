from fastapi import FastAPI
from app.config import Settings
from app.routes import events_router, devices_router, locations_router, users_router

settings = Settings()
app = FastAPI(title='anapshot-backend')

app.include_router(events_router, prefix="/api/v1", tags=["events"])
app.include_router(devices_router, prefix="/api/v1", tags=["devices"])
app.include_router(locations_router, prefix="/api/v1", tags=["locations"])
app.include_router(users_router, prefix="/api/v1", tags=["users"])

@app.get('/health')
async def health():
    return {'status': 'ok', 'service': 'anapshot-backend'}
