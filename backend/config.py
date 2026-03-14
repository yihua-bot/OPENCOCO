from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://coco:coco@localhost:5432/coco"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "dev-secret-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080
    upload_dir: str = "./uploads"

    google_client_id: str = ""
    google_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""

    kling_api_key: str = ""
    kling_api_secret: str = ""
    anthropic_api_key: str = ""

    sentry_dsn: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
