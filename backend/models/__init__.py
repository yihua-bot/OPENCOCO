import uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, JSON, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
import enum


def gen_id():
    return str(uuid.uuid4())


class PlanType(str, enum.Enum):
    free = "free"
    pro = "pro"
    business = "business"


class ProjectStatus(str, enum.Enum):
    idle = "idle"
    generating = "generating"
    done = "done"
    failed = "failed"


class VideoStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    done = "done"
    failed = "failed"


class MessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String, default="")
    avatar: Mapped[str] = mapped_column(String, default="")
    hashed_password: Mapped[str | None] = mapped_column(String, nullable=True)
    plan: Mapped[PlanType] = mapped_column(SAEnum(PlanType), default=PlanType.free)
    credits: Mapped[int] = mapped_column(Integer, default=5)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    projects: Mapped[list["Project"]] = relationship(back_populates="user")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String, default="Untitled Project")
    thumbnail_url: Mapped[str] = mapped_column(String, default="")
    status: Mapped[ProjectStatus] = mapped_column(SAEnum(ProjectStatus), default=ProjectStatus.idle)
    template_id: Mapped[str | None] = mapped_column(String, nullable=True)
    context_md: Mapped[str] = mapped_column(Text, default="")
    edit_log: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="projects")
    messages: Mapped[list["Message"]] = relationship(back_populates="project", order_by="Message.created_at")
    videos: Mapped[list["Video"]] = relationship(back_populates="project")
    storyboards: Mapped[list["Storyboard"]] = relationship(back_populates="project")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    role: Mapped[MessageRole] = mapped_column(SAEnum(MessageRole))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped["Project"] = relationship(back_populates="messages")
    video: Mapped["Video | None"] = relationship(back_populates="message", uselist=False)


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    message_id: Mapped[str | None] = mapped_column(ForeignKey("messages.id"), nullable=True)
    url: Mapped[str] = mapped_column(String, default="")
    thumbnail_url: Mapped[str] = mapped_column(String, default="")
    duration: Mapped[float] = mapped_column(default=0.0)
    status: Mapped[VideoStatus] = mapped_column(SAEnum(VideoStatus), default=VideoStatus.pending)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped["Project"] = relationship(back_populates="videos")
    message: Mapped["Message | None"] = relationship(back_populates="video")


class ShotStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    done = "done"
    failed = "failed"


class Storyboard(Base):
    __tablename__ = "storyboards"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    prompt: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(String, default="")
    final_video_id: Mapped[str | None] = mapped_column(ForeignKey("videos.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped["Project"] = relationship(back_populates="storyboards")
    shots: Mapped[list["Shot"]] = relationship(back_populates="storyboard", order_by="Shot.order")
    final_video: Mapped["Video | None"] = relationship(foreign_keys="[Storyboard.final_video_id]")


class Shot(Base):
    __tablename__ = "shots"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    storyboard_id: Mapped[str] = mapped_column(ForeignKey("storyboards.id"))
    order: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(Text)
    script: Mapped[str] = mapped_column(Text, default="")
    duration: Mapped[float] = mapped_column(default=5.0)
    status: Mapped[ShotStatus] = mapped_column(SAEnum(ShotStatus), default=ShotStatus.pending)
    video_id: Mapped[str | None] = mapped_column(ForeignKey("videos.id"), nullable=True)
    preview_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    storyboard: Mapped["Storyboard"] = relationship(back_populates="shots")
    video: Mapped["Video | None"] = relationship(foreign_keys="[Shot.video_id]")


class Template(Base):
    __tablename__ = "templates"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    name: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    preview_url: Mapped[str] = mapped_column(String, default="")
    prompt_template: Mapped[str] = mapped_column(Text, default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
