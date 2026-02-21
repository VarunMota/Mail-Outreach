from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class ContactImportSummary(BaseModel):
    total_rows: int
    inserted: int
    skipped_duplicates: int
    invalid_emails: int


class ContactResponse(BaseModel):
    """Contact data for API responses."""
    id: int
    email: EmailStr
    first_name: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
