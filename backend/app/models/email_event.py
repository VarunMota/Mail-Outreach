from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from .base import TimestampModel

class EmailEvent(TimestampModel):
    __tablename__ = "email_events"

    type = Column(String, nullable=False, index=True)  # open, click, reply, bounce
    campaign_contact_id = Column(Integer, ForeignKey("campaign_contacts.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False)
    metadata_json = Column(JSON)

    # Relationships
    campaign_contact = relationship("CampaignContact", back_populates="events")
