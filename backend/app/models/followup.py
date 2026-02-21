from sqlalchemy import Column, String, Integer, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from .base import TimestampModel

class CampaignFollowup(TimestampModel):
    __tablename__ = "campaign_followups"

    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    step_number = Column(Integer, nullable=False)  # 1, 2, 3...
    delay_days = Column(Integer, nullable=False, default=2)
    trigger_condition = Column(String, nullable=False, default="no_reply") # no_reply, no_open
    
    subject_template = Column(String)
    body_template = Column(Text)

    # Relationships
    campaign = relationship("Campaign", back_populates="followups")
