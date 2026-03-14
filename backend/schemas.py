from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from models import PlanType, ProjectStatus, VideoStatus, MessageRole, ShotStatus


# Auth
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str = ""


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    avatar: str
    plan: PlanType
    credits: int
    created_at: datetime

    class Config:
        from_attributes = True


# Projects
class ProjectCreate(BaseModel):
    title: str = "Untitled Project"
    template_id: Optional[str] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    thumbnail_url: Optional[str] = None


class ProjectOut(BaseModel):
    id: str
    title: str
    thumbnail_url: str
    status: ProjectStatus
    template_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Messages
class LLMConfig(BaseModel):
    """User-supplied LLM configuration (storyboard model)."""
    provider: str = "claude"
    api_key: str = ""
    model: str = ""
    base_url: Optional[str] = None
    fallbacks: Optional[List[dict]] = None


class VideoLLMConfig(BaseModel):
    """User-supplied video generation configuration."""
    provider: str = "kling"
    api_key: str = ""
    api_secret: Optional[str] = None
    base_url: Optional[str] = None


class MessageCreate(BaseModel):
    content: str
    llm_config: Optional[LLMConfig] = None
    video_config: Optional[VideoLLMConfig] = None
    style_pack_id: Optional[str] = "default"
    storyboard_id: Optional[str] = None  # set when refining existing storyboard


class MessageOut(BaseModel):
    id: str
    role: MessageRole
    content: str
    created_at: datetime
    video_id: Optional[str] = None

    class Config:
        from_attributes = True


# Videos
class VideoOut(BaseModel):
    id: str
    project_id: str
    url: str
    thumbnail_url: str
    duration: float
    status: VideoStatus
    meta: dict
    created_at: datetime

    class Config:
        from_attributes = True


# Templates
class TemplateOut(BaseModel):
    id: str
    name: str
    category: str
    description: str
    preview_url: str
    prompt_template: str

    class Config:
        from_attributes = True


# Storyboard / Shots
class ShotUpdate(BaseModel):
    description: Optional[str] = None
    script: Optional[str] = None
    duration: Optional[float] = None
    order: Optional[int] = None


class ShotOut(BaseModel):
    id: str
    storyboard_id: str
    order: int
    description: str
    script: str
    duration: float
    status: ShotStatus
    video_id: Optional[str] = None
    video: Optional[VideoOut] = None
    preview_image_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StoryboardOut(BaseModel):
    id: str
    project_id: str
    prompt: str
    title: str
    final_video_id: Optional[str] = None
    shots: List[ShotOut] = []
    created_at: datetime

    class Config:
        from_attributes = True
