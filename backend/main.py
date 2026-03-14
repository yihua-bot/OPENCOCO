from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from models import Base
from routers import auth, projects, messages, videos, templates, storyboards, timeline, style_packs, image_preview
from config import settings

# Sentry — only initializes if SENTRY_DSN is set
try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    _dsn = getattr(settings, "sentry_dsn", "")
    if _dsn:
        sentry_sdk.init(
            dsn=_dsn,
            integrations=[FastApiIntegration(), SqlalchemyIntegration()],
            traces_sample_rate=0.2,
            send_default_pii=False,
        )
except ImportError:
    pass

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Medeo Clone API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(messages.router)
app.include_router(videos.router)
app.include_router(templates.router)
app.include_router(storyboards.router)
app.include_router(timeline.router)
app.include_router(style_packs.router)
app.include_router(image_preview.router)


@app.get("/health")
def health():
    return {"status": "ok"}
