from fastapi import FastAPI
from app.config import Settings

settings = Settings()
app = FastAPI(title='anapshot-backend')

@app.get('/health')
async def health():
    return {'status': 'ok', 'service': 'anapshot-backend'}
