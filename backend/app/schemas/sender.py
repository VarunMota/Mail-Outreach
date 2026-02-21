"""Pydantic schemas for SenderAccount."""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime


class SenderAccountBase(BaseModel):
    """Base schema with common fields."""
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    smtp_host: str = Field(default="smtp.gmail.com")
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_username: str
    smtp_use_tls: bool = Field(default=True)
    daily_limit: int = Field(default=100, ge=1, le=10000)
    is_active: bool = Field(default=True)
    is_default: bool = Field(default=False)

    @field_validator('smtp_port')
    @classmethod
    def validate_smtp_port(cls, v):
        common_ports = [25, 465, 587, 2525]
        if v not in common_ports and (v < 1 or v > 65535):
            raise ValueError(f"Invalid SMTP port. Common ports: {common_ports}")
        return v


class SenderAccountCreate(SenderAccountBase):
    """Schema for creating a sender account."""
    smtp_password: str = Field(..., min_length=1)


class SenderAccountUpdate(BaseModel):
    """Schema for updating a sender account."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = Field(None, ge=1, le=65535)
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: Optional[bool] = None
    daily_limit: Optional[int] = Field(None, ge=1, le=10000)
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class SenderAccountResponse(SenderAccountBase):
    """Schema for sender account response (excludes password)."""
    id: int
    smtp_password_masked: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_tested_at: Optional[datetime] = None
    last_test_status: Optional[str] = None

    class Config:
        from_attributes = True


class SenderAccountDetail(SenderAccountResponse):
    """Detailed schema including campaigns using this sender."""
    campaign_count: int = 0


class SenderTestRequest(BaseModel):
    """Schema for testing SMTP connection."""
    test_email: Optional[EmailStr] = None  # Email to send test to (defaults to sender email)


class SenderTestResponse(BaseModel):
    """Schema for SMTP test result."""
    success: bool
    message: str
    details: Optional[str] = None


class SenderListResponse(BaseModel):
    """Schema for list of sender accounts."""
    items: list[SenderAccountResponse]
    total: int
