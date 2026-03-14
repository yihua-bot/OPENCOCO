"""Shot preview image generation endpoint."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Shot, Storyboard, Project, User
from auth import get_current_user
from services.image_gen import generate_preview_image

router = APIRouter(prefix="/api/projects/{project_id}/storyboards/{storyboard_id}/shots", tags=["preview"])


class PreviewRequest(BaseModel):
    provider: str = "mock"
    api_key: str = ""
    model: str = ""
    base_url: Optional[str] = None


@router.post("/{shot_id}/preview")
def generate_shot_preview(
    project_id: str,
    storyboard_id: str,
    shot_id: str,
    data: PreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify ownership
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    shot = db.query(Shot).filter(Shot.id == shot_id, Shot.storyboard_id == storyboard_id).first()
    if not shot:
        raise HTTPException(status_code=404, detail="Shot not found")

    try:
        image_url = generate_preview_image(
            description=shot.description,
            provider=data.provider,
            api_key=data.api_key,
            model=data.model,
            base_url=data.base_url,
        )
        shot.preview_image_url = image_url
        db.commit()
        return {"preview_image_url": image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"图片生成失败: {str(e)}")


@router.post("/preview-all")
def generate_all_previews(
    project_id: str,
    storyboard_id: str,
    data: PreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate preview images for all shots in a storyboard."""
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    storyboard = db.query(Storyboard).filter(
        Storyboard.id == storyboard_id, Storyboard.project_id == project_id
    ).first()
    if not storyboard:
        raise HTTPException(status_code=404, detail="Storyboard not found")

    results = []
    for shot in storyboard.shots:
        try:
            image_url = generate_preview_image(
                description=shot.description,
                provider=data.provider,
                api_key=data.api_key,
                model=data.model,
                base_url=data.base_url,
            )
            shot.preview_image_url = image_url
            results.append({"shot_id": shot.id, "preview_image_url": image_url})
        except Exception as e:
            results.append({"shot_id": shot.id, "error": str(e)})

    db.commit()
    return {"results": results}
