from sqlalchemy import Column, String, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from .base import TimestampModel

class EmailLog(TimestampModel):
    __tablename__ = "email_logs"

    campaign_contact_id = Column(Integer, ForeignKey("campaign_contacts.id"), nullable=False, index=True)
    message_id = Column(String, index=True)
    subject = Column(String)
    recipient = Column(String)
    status = Column(String)  # sent, failed, etc.
    error_message = Column(Text)

    # Relationships
    campaign_contact = relationship("CampaignContact", back_populates="logs")
