from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .base import TimestampModel

class Campaign(TimestampModel):
    __tablename__ = "campaigns"

    name = Column(String, nullable=False)
    subject_template = Column(String)
    body_template = Column(Text)
    # Status: draft, running, paused, stopped, completed, failed, scheduled
    status = Column(String, default="draft")
    daily_limit = Column(Integer, default=50)
    delay_seconds = Column(Integer, default=60)
    celery_task_id = Column(String, nullable=True)
    
    # Scheduling
    scheduled_at = Column(DateTime, nullable=True)
    
    # Sender account FK
    sender_id = Column(Integer, ForeignKey("sender_accounts.id"), nullable=True)
    sender = relationship("SenderAccount", back_populates="campaigns")

    # Relationships
    contacts = relationship("CampaignContact", back_populates="campaign")
    followups = relationship("CampaignFollowup", back_populates="campaign", order_by="CampaignFollowup.step_number")
    attachments = relationship("CampaignAttachment", back_populates="campaign", cascade="all, delete-orphan")
