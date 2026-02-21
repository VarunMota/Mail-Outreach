import sys
import os

# Add current directory to sys.path
sys.path.append(os.getcwd())

try:
    import aiosmtplib
    print("aiosmtplib imported successfully")
except ImportError as e:
    print(f"Failed to import aiosmtplib: {e}")

try:
    import pytest
    print("pytest imported successfully")
except ImportError as e:
    print(f"Failed to import pytest: {e}")

try:
    from app.services.email.smtp import SMTPSender
    print("SMTPSender imported successfully")
except Exception as e:
    print(f"Failed to import SMTPSender: {e}")
