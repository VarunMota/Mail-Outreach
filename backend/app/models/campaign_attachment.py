"""Campaign attachment model for storing file references."""
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from .base import TimestampModel


class CampaignAttachment(TimestampModel):
    __tablename__ = "campaign_attachments"

    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    filename = Column(String, nullable=False)  # Original filename
    file_path = Column(String, nullable=False)  # Stored file path
    file_size = Column(Integer)  # File size in bytes
    mime_type = Column(String)  # MIME type (e.g., application/pdf)

    # Relationship
    campaign = relationship("Campaign", back_populates="attachments")
