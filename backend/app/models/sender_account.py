"""Sender Account model for storing SMTP credentials."""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import validates, relationship
from ..db import Base
from ..utils.crypto import encrypt_value, decrypt_value, mask_sensitive


class SenderAccount(Base):
    __tablename__ = "sender_accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # Display name (e.g., "Primary Gmail")
    email = Column(String, nullable=False, index=True)  # From email address
    
    # Sender type: "smtp" or "gmail_oauth"
    type = Column(String, nullable=False, default="smtp")
    
    # For Gmail OAuth: reference to GoogleAccount
    google_account_id = Column(Integer, ForeignKey("google_accounts.id"), nullable=True)
    google_account = relationship("GoogleAccount", back_populates="sender_accounts")
    
    # SMTP Configuration (for type="smtp")
    smtp_host = Column(String, nullable=True, default="smtp.gmail.com")
    smtp_port = Column(Integer, nullable=True, default=587)
    smtp_username = Column(String, nullable=True)  # Usually same as email
    _smtp_password_encrypted = Column("smtp_password_encrypted", String, nullable=True)
    smtp_use_tls = Column(Boolean, default=True)  # True for TLS (port 587), False for SSL (port 465)
    
    # Limits
    daily_limit = Column(Integer, default=100)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_tested_at = Column(DateTime(timezone=True), nullable=True)
    last_test_status = Column(String, nullable=True)  # 'success', 'failed', or None

    # Relationships
    campaigns = relationship("Campaign", back_populates="sender")

    @property
    def smtp_password(self) -> str:
        """Get decrypted SMTP password."""
        return decrypt_value(self._smtp_password_encrypted)

    @smtp_password.setter
    def smtp_password(self, value: str):
        """Set and encrypt SMTP password."""
        self._smtp_password_encrypted = encrypt_value(value)

    @property
    def smtp_password_masked(self) -> str:
        """Get masked password for display."""
        # Show that a password exists but mask it
        if self._smtp_password_encrypted:
            return "********"
        return ""

    @validates('email')
    def validate_email(self, key, email):
        if not email or '@' not in email:
            raise ValueError("Invalid email address")
        return email.lower().strip()

    @validates('smtp_port')
    def validate_port(self, key, port):
        if not isinstance(port, int) or port < 1 or port > 65535:
            raise ValueError("Invalid SMTP port")
        return port

    def to_dict(self, include_sensitive: bool = False) -> dict:
        """Convert to dictionary. Never include password unless explicitly requested."""
        data = {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "type": self.type,
            "google_account_id": self.google_account_id,
            "smtp_host": self.smtp_host,
            "smtp_port": self.smtp_port,
            "smtp_username": self.smtp_username,
            "smtp_use_tls": self.smtp_use_tls,
            "daily_limit": self.daily_limit,
            "is_active": self.is_active,
            "is_default": self.is_default,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_tested_at": self.last_tested_at.isoformat() if self.last_tested_at else None,
            "last_test_status": self.last_test_status,
        }
        
        if include_sensitive:
            data["smtp_password"] = self.smtp_password
        else:
            data["smtp_password_masked"] = self.smtp_password_masked
            
        return data

    def __repr__(self):
        return f"<SenderAccount(id={self.id}, email='{self.email}', name='{self.name}')>"
