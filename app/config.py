from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    mongo_url: str = 'mongodb://localhost:27017'
    redis_url: str = 'redis://localhost:6379'
    kafka_bootstrap_servers: str = 'localhost:9092'
    secret_key: str = 'changeme'
    # Web Push (VAPID) — generate with: pip install py-vapid && vapid --gen --applicationServerKey
    vapid_private_key: Optional[str] = None  # base64url-encoded EC private key
    vapid_public_key: Optional[str] = None   # base64url-encoded EC public key (sent to browsers)
    vapid_claims_email: Optional[str] = None # e.g. admin@example.com

    class Config:
        env_file = '.env'
        env_file_encoding = 'utf-8'
