from pydantic import BaseModel

class CampaignStats(BaseModel):
    total_contacts: int
    sent: int
    opened: int
    clicked: int
    replied: int
    bounced: int
    
    open_rate: float
    click_rate: float
    reply_rate: float
    bounce_rate: float

class CampaignResponse(BaseModel):
    id: int
    name: str
    status: str
    stats: CampaignStats
