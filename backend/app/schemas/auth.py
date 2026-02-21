"""Authentication schemas."""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class GoogleUserInfo(BaseModel):
    """Google user info from OAuth."""
    id: str  # Google sub
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None
    verified_email: bool = True


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: dict


class GoogleAuthCallback(BaseModel):
    """Google OAuth callback data."""
    code: str
    state: Optional[str] = None


class AuthStatusResponse(BaseModel):
    """Authentication status response."""
    is_authenticated: bool
    user: Optional[dict] = None
    has_google_connected: bool = False
    google_email: Optional[str] = None


class GoogleConnectResponse(BaseModel):
    """Google account connection response."""
    success: bool
    email: str
    message: str


class UserResponse(BaseModel):
    """User response model."""
    id: int
    email: str
    name: Optional[str]
    picture_url: Optional[str]
    is_active: bool
    has_google_connected: bool
    created_at: Optional[datetime]
    
    class Config:
        from_attributes = True
