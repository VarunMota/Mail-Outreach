from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .base import TimestampModel

class CampaignContact(TimestampModel):
    __tablename__ = "campaign_contacts"

    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False, index=True)
    
    # Status: pending, sent, failed, skipped, opened, clicked, replied, bounced
    status = Column(String, default="pending")
    sent_at = Column(DateTime)
    opened_at = Column(DateTime)
    clicked_at = Column(DateTime)
    replied_at = Column(DateTime)
    bounce_reason = Column(String)
    last_step_sent = Column(Integer, default=0) # 0 = initial email, 1 = followup 1, etc.

    # Relationships
    campaign = relationship("Campaign", back_populates="contacts")
    contact = relationship("Contact", back_populates="campaigns")
    events = relationship("EmailEvent", back_populates="campaign_contact")
    logs = relationship("EmailLog", back_populates="campaign_contact")
