from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class CampaignFollowupBase(BaseModel):
    step_number: int
    delay_days: int
    trigger_condition: str = "no_reply" # no_reply, no_open
    subject_template: Optional[str] = None
    body_template: Optional[str] = None

class CampaignAttachmentBase(BaseModel):
    id: int
    filename: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class CampaignCreate(BaseModel):
    name: str
    subject_template: str
    body_template: str
    sender_id: int  # Required sender account
    schedule: Optional[datetime] = None
    daily_limit: int = 50
    followups: List[CampaignFollowupBase] = []

class CampaignResponse(BaseModel):
    id: int
    name: str
    status: str
    sender_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    created_at: datetime
    followups: List[CampaignFollowupBase] = []
    attachments: List[CampaignAttachmentBase] = []
    
    class Config:
        from_attributes = True


class CampaignListItem(BaseModel):
    """Campaign item for list view with summary stats."""
    id: int
    name: str
    status: str
    created_at: datetime
    sent_count: int
    open_rate: float
    reply_rate: float
    
    class Config:
        from_attributes = True
