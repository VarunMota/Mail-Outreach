"""GoogleAccount model for storing OAuth tokens."""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db import Base
from ..utils.crypto import encrypt_value, decrypt_value


class GoogleAccount(Base):
    __tablename__ = "google_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # OAuth Tokens (encrypted)
    _access_token_encrypted = Column("access_token_encrypted", String, nullable=False)
    _refresh_token_encrypted = Column("refresh_token_encrypted", String, nullable=False)
    
    # Token metadata
    token_expiry = Column(DateTime(timezone=True), nullable=False)
    scope = Column(String, nullable=False)
    
    # Gmail profile info
    gmail_email = Column(String, nullable=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="google_account")
    sender_accounts = relationship("SenderAccount", back_populates="google_account")

    @property
    def access_token(self) -> str:
        """Get decrypted access token."""
        return decrypt_value(self._access_token_encrypted)

    @access_token.setter
    def access_token(self, value: str):
        """Set and encrypt access token."""
        self._access_token_encrypted = encrypt_value(value)

    @property
    def refresh_token(self) -> str:
        """Get decrypted refresh token."""
        return decrypt_value(self._refresh_token_encrypted)

    @refresh_token.setter
    def refresh_token(self, value: str):
        """Set and encrypt refresh token."""
        self._refresh_token_encrypted = encrypt_value(value)

    def is_token_expired(self) -> bool:
        """Check if access token is expired (with 5 min buffer)."""
        if not self.token_expiry:
            return True
        # Add 5 minute buffer
        buffer = datetime.now(self.token_expiry.tzinfo) if self.token_expiry.tzinfo else datetime.utcnow()
        return datetime.now(self.token_expiry.tzinfo) if self.token_expiry.tzinfo else datetime.utcnow() >= self.token_expiry

    def to_dict(self, include_tokens: bool = False) -> dict:
        """Convert to dictionary. Never include tokens unless explicitly requested."""
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "gmail_email": self.gmail_email,
            "scope": self.scope,
            "token_expired": self.is_token_expired(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_tokens:
            data["access_token"] = self.access_token
            data["refresh_token"] = self.refresh_token
            
        return data

    def __repr__(self):
        return f"<GoogleAccount(id={self.id}, user_id={self.user_id}, email='{self.gmail_email}')>"
