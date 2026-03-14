from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Template
from schemas import TemplateOut

router = APIRouter(prefix="/api/templates", tags=["templates"])

SEED_TEMPLATES = [
    {"name": "Realistic Film", "category": "film", "description": "Cinematic live-action style with color grading and film grain.", "prompt_template": "Create a realistic cinematic video about {topic}. Use natural lighting, film grain, and professional color grading."},
    {"name": "Anime Opening", "category": "anime", "description": "Japanese anime OP style with dynamic cuts and vibrant colors.", "prompt_template": "Create an anime opening sequence for {topic}. Include dynamic action shots, vibrant colors, and epic music."},
    {"name": "Commercial Ad", "category": "commercial", "description": "Professional product advertisement with clean visuals.", "prompt_template": "Create a 30-second commercial for {topic}. Clean, modern visuals with a clear call to action."},
    {"name": "Explainer Video", "category": "explainer", "description": "Clear, engaging explainer with motion graphics.", "prompt_template": "Create an explainer video about {topic}. Use simple animations and clear narration."},
    {"name": "Kids Song", "category": "kids", "description": "Colorful, fun animated video for children.", "prompt_template": "Create a fun kids song video about {topic}. Bright colors, cute characters, simple lyrics."},
    {"name": "Music Video", "category": "music", "description": "Stylized music video with visual effects.", "prompt_template": "Create a music video for {topic}. Artistic visuals synchronized to the beat."},
    {"name": "Fan Edit", "category": "fan", "description": "Aesthetic fan edit montage with cinematic effects.", "prompt_template": "Create a fan edit video for {topic}. Cinematic cuts, color grading, and emotional music."},
    {"name": "Lip Sync", "category": "lipsync", "description": "Sync any face to audio with AI.", "prompt_template": "Create a lip sync video where {topic} is speaking or singing."},
]


def seed_templates(db: Session):
    if db.query(Template).count() == 0:
        import uuid
        for i, t in enumerate(SEED_TEMPLATES):
            db.add(Template(id=str(uuid.uuid4()), sort_order=i, **t))
        db.commit()


@router.get("", response_model=List[TemplateOut])
def list_templates(db: Session = Depends(get_db)):
    seed_templates(db)
    return db.query(Template).order_by(Template.sort_order).all()
