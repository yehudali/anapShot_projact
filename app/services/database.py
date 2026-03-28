from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis
from app.config import Settings

settings = Settings()

# MongoDB
mongo_client = AsyncIOMotorClient(settings.mongo_url)
database = mongo_client.snapshot

# Collections
users_collection = database.users
devices_collection = database.devices
events_collection = database.events
locations_collection = database.locations

# Redis
redis_client = redis.from_url(settings.redis_url)