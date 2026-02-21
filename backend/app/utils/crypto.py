"""
Encryption utilities for sensitive data like SMTP passwords.
Uses Fernet symmetric encryption with key from environment.
"""
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def _get_fernet() -> Fernet:
    """Get or create Fernet instance from environment key."""
    key = os.getenv("ENCRYPTION_KEY")
    
    if not key:
        # Generate a key from a fallback secret (not secure for production)
        # In production, ENCRYPTION_KEY should be set explicitly
        fallback_secret = os.getenv("SECRET_KEY", "default-secret-key-change-in-production")
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"outreach-salt-2024",  # Fixed salt - in production use random salt stored with data
            iterations=480000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(fallback_secret.encode()))
    else:
        # Ensure the provided key is properly formatted
        if len(key) < 32:
            # Pad short keys
            key = base64.urlsafe_b64encode(key.ljust(32)[:32].encode())
        else:
            try:
                # Try to decode if it's base64
                base64.urlsafe_b64decode(key)
            except Exception:
                # Not valid base64, hash it
                key = base64.urlsafe_b64encode(key[:32].encode())
    
    return Fernet(key)


def encrypt_value(value: str) -> str:
    """Encrypt a string value."""
    if not value:
        return ""
    fernet = _get_fernet()
    encrypted = fernet.encrypt(value.encode())
    return base64.urlsafe_b64encode(encrypted).decode()


def decrypt_value(encrypted_value: str) -> str:
    """Decrypt an encrypted string value."""
    if not encrypted_value:
        return ""
    try:
        fernet = _get_fernet()
        # Decode from base64 first (our encoding)
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_value.encode())
        # Decrypt with Fernet
        decrypted = fernet.decrypt(encrypted_bytes)
        return decrypted.decode()
    except Exception as e:
        # If decryption fails, return empty string
        # This prevents crashes but means the password won't work
        return ""


def mask_sensitive(value: str, visible_chars: int = 4) -> str:
    """Mask a sensitive value, showing only last N characters."""
    if not value:
        return ""
    if len(value) <= visible_chars:
        return "*" * len(value)
    return "*" * (len(value) - visible_chars) + value[-visible_chars:]
