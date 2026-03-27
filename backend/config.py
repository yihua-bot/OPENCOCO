from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./coco.db"
    secret_key: str = "dev-secret-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080
    upload_dir: str = "./uploads"
    watermark_video_path: str = "./assets/coco_watermark.mp4"

    google_client_id: str = ""
    google_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""

    kling_api_key: str = ""
    kling_api_secret: str = ""
    anthropic_api_key: str = ""

    sentry_dsn: str = ""

    environment: str = "development"
    mock_video_generation: bool = False
    mock_image_generation: bool = False

    # Email verification login
    cloud_auth_url: str = ""
    resend_api_key: str = ""
    resend_from_email: str = "CoCo <noreply@example.com>"

    # Dev password-login seed user
    enable_dev_login: bool = False
    dev_login_email: str = "dev@coco.local"
    dev_login_password: str = "change-me"

    # Polar membership payment
    polar_access_token: str = ""
    polar_product_id: str = ""
    polar_api_base: str = "https://api.polar.sh"
    polar_checkout_url: str = ""
    polar_dashboard_product_url: str = ""
    polar_membership_days: int = 30

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
