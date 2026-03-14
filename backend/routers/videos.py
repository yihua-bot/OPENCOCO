from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Video, Project, User
from schemas import VideoOut
from auth import get_current_user

router = APIRouter(prefix="/api/videos", tags=["videos"])


@router.get("/{video_id}", response_model=VideoOut)
def get_video(video_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    project = db.query(Project).filter(Project.id == video.project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=403, detail="Forbidden")
    return video


@router.get("/project/{project_id}", response_model=list[VideoOut])
def list_project_videos(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project.videos
