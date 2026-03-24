from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    mongo_url: str = 'mongodb://localhost:27017'
    redis_url: str = 'redis://localhost:6379'
    kafka_bootstrap_servers: str = 'localhost:9092'
    secret_key: str = 'changeme'

    class Config:
        env_file = '.env'
        env_file_encoding = 'utf-8'
