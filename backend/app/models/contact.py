from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from .base import TimestampModel

class Contact(TimestampModel):
    __tablename__ = "contacts"

    email = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String)
    company = Column(String)
    title = Column(String)

    # Relationships
    campaigns = relationship("CampaignContact", back_populates="contact")
