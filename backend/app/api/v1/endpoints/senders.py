"""API endpoints for Sender Account management."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

from ....db import get_db
from ....models.sender_account import SenderAccount
from ....schemas.sender import (
    SenderAccountCreate, 
    SenderAccountUpdate, 
    SenderAccountResponse,
    SenderAccountDetail,
    SenderTestRequest,
    SenderTestResponse,
    SenderListResponse
)
from ....utils.logging import logger

router = APIRouter()


@router.get("/", response_model=SenderListResponse)
def list_senders(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """List all sender accounts."""
    query = db.query(SenderAccount).order_by(SenderAccount.created_at.desc())
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    
    return {
        "items": [sender.to_dict() for sender in items],
        "total": total
    }


@router.get("/active", response_model=List[SenderAccountResponse])
def list_active_senders(db: Session = Depends(get_db)):
    """List only active sender accounts (for dropdowns)."""
    senders = db.query(SenderAccount).filter(
        SenderAccount.is_active == True
    ).order_by(SenderAccount.name).all()
    
    return [sender.to_dict() for sender in senders]


@router.get("/default", response_model=SenderAccountResponse)
def get_default_sender(db: Session = Depends(get_db)):
    """Get the default sender account."""
    sender = db.query(SenderAccount).filter(
        SenderAccount.is_default == True,
        SenderAccount.is_active == True
    ).first()
    
    if not sender:
        # Return first active sender if no default
        sender = db.query(SenderAccount).filter(
            SenderAccount.is_active == True
        ).first()
    
    if not sender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active sender account found"
        )
    
    return sender.to_dict()


@router.post("/", response_model=SenderAccountResponse, status_code=status.HTTP_201_CREATED)
def create_sender(
    sender_in: SenderAccountCreate, 
    db: Session = Depends(get_db)
):
    """Create a new sender account."""
    # Check if email already exists
    existing = db.query(SenderAccount).filter(
        SenderAccount.email == sender_in.email
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sender with email '{sender_in.email}' already exists"
        )
    
    # If this is the first sender or marked as default, handle default logic
    if sender_in.is_default:
        # Unset existing default
        db.query(SenderAccount).filter(
            SenderAccount.is_default == True
        ).update({"is_default": False})
    elif db.query(SenderAccount).count() == 0:
        # First sender becomes default
        sender_in.is_default = True
    
    # Create sender
    sender = SenderAccount(
        name=sender_in.name,
        email=sender_in.email,
        smtp_host=sender_in.smtp_host,
        smtp_port=sender_in.smtp_port,
        smtp_username=sender_in.smtp_username,
        smtp_use_tls=sender_in.smtp_use_tls,
        daily_limit=sender_in.daily_limit,
        is_active=sender_in.is_active,
        is_default=sender_in.is_default
    )
    sender.smtp_password = sender_in.smtp_password  # Encrypts password
    
    db.add(sender)
    db.commit()
    db.refresh(sender)
    
    logger.info(f"Created sender account: {sender.email} (ID: {sender.id})")
    
    return sender.to_dict()


@router.get("/{sender_id}", response_model=SenderAccountDetail)
def get_sender(sender_id: int, db: Session = Depends(get_db)):
    """Get a specific sender account."""
    sender = db.query(SenderAccount).get(sender_id)
    
    if not sender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sender account not found"
        )
    
    # Get campaign count
    campaign_count = db.query(func.count()).filter(
        SenderAccount.campaigns.any(id=sender_id)
    ).scalar() or 0
    
    data = sender.to_dict()
    data["campaign_count"] = campaign_count
    
    return data


@router.put("/{sender_id}", response_model=SenderAccountResponse)
def update_sender(
    sender_id: int, 
    sender_in: SenderAccountUpdate, 
    db: Session = Depends(get_db)
):
    """Update a sender account."""
    sender = db.query(SenderAccount).get(sender_id)
    
    if not sender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sender account not found"
        )
    
    # Check email uniqueness if changing
    if sender_in.email and sender_in.email != sender.email:
        existing = db.query(SenderAccount).filter(
            SenderAccount.email == sender_in.email
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sender with email '{sender_in.email}' already exists"
            )
    
    # Handle default flag
    if sender_in.is_default:
        db.query(SenderAccount).filter(
            SenderAccount.is_default == True,
            SenderAccount.id != sender_id
        ).update({"is_default": False})
    
    # Update fields
    update_data = sender_in.model_dump(exclude_unset=True)
    
    # Handle password separately to trigger encryption
    if "smtp_password" in update_data:
        sender.smtp_password = update_data.pop("smtp_password")
    
    for field, value in update_data.items():
        setattr(sender, field, value)
    
    sender.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(sender)
    
    logger.info(f"Updated sender account: {sender.email} (ID: {sender.id})")
    
    return sender.to_dict()


@router.delete("/{sender_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sender(sender_id: int, db: Session = Depends(get_db)):
    """Delete a sender account."""
    sender = db.query(SenderAccount).get(sender_id)
    
    if not sender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sender account not found"
        )
    
    # Check if sender is used by any campaigns
    campaign_count = len(sender.campaigns)
    if campaign_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete sender used by {campaign_count} campaigns. Deactivate instead."
        )
    
    db.delete(sender)
    db.commit()
    
    logger.info(f"Deleted sender account: {sender.email} (ID: {sender.id})")


@router.post("/{sender_id}/test", response_model=SenderTestResponse)
async def test_sender_connection(
    sender_id: int, 
    test_request: SenderTestRequest = None,
    db: Session = Depends(get_db)
):
    """Test SMTP connection for a sender account."""
    sender = db.query(SenderAccount).get(sender_id)
    
    if not sender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sender account not found"
        )
    
    test_email = test_request.test_email if test_request else sender.email
    
    try:
        # Create test message
        message = MIMEMultipart("alternative")
        message["From"] = f"{sender.name} <{sender.email}>"
        message["To"] = test_email
        message["Subject"] = "SMTP Test - Outreach Platform"
        
        text_body = f"""
This is a test email from your Cold Email Outreach Platform.

Sender Account: {sender.name} ({sender.email})
SMTP Host: {sender.smtp_host}:{sender.smtp_port}
Test Time: {datetime.utcnow().isoformat()}

If you received this email, your SMTP configuration is working correctly!
        """.strip()
        
        message.attach(MIMEText(text_body, "plain"))
        
        # Send test email
        await aiosmtplib.send(
            message,
            hostname=sender.smtp_host,
            port=sender.smtp_port,
            username=sender.smtp_username,
            password=sender.smtp_password,
            use_tls=sender.smtp_use_tls if sender.smtp_port == 465 else False,
            start_tls=sender.smtp_use_tls if sender.smtp_port == 587 else False
        )
        
        # Update test status
        sender.last_tested_at = datetime.utcnow()
        sender.last_test_status = "success"
        db.commit()
        
        logger.info(f"SMTP test successful for sender: {sender.email}")
        
        return SenderTestResponse(
            success=True,
            message="SMTP connection test successful",
            details=f"Test email sent to {test_email}"
        )
        
    except aiosmtplib.SMTPAuthenticationError as e:
        sender.last_tested_at = datetime.utcnow()
        sender.last_test_status = "failed"
        db.commit()
        
        logger.error(f"SMTP authentication failed for {sender.email}: {e}")
        return SenderTestResponse(
            success=False,
            message="Authentication failed",
            details="Check your username and password. For Gmail, use an App Password."
        )
        
    except aiosmtplib.SMTPConnectError as e:
        sender.last_tested_at = datetime.utcnow()
        sender.last_test_status = "failed"
        db.commit()
        
        logger.error(f"SMTP connection failed for {sender.email}: {e}")
        return SenderTestResponse(
            success=False,
            message="Connection failed",
            details=f"Could not connect to {sender.smtp_host}:{sender.smtp_port}. Check host and port."
        )
        
    except Exception as e:
        sender.last_tested_at = datetime.utcnow()
        sender.last_test_status = "failed"
        db.commit()
        
        logger.error(f"SMTP test failed for {sender.email}: {e}")
        return SenderTestResponse(
            success=False,
            message="Test failed",
            details=str(e)
        )


@router.post("/{sender_id}/set-default", response_model=SenderAccountResponse)
def set_default_sender(sender_id: int, db: Session = Depends(get_db)):
    """Set a sender account as the default."""
    sender = db.query(SenderAccount).get(sender_id)
    
    if not sender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sender account not found"
        )
    
    # Unset all other defaults
    db.query(SenderAccount).filter(
        SenderAccount.is_default == True
    ).update({"is_default": False})
    
    # Set this as default
    sender.is_default = True
    sender.is_active = True  # Default must be active
    db.commit()
    db.refresh(sender)
    
    logger.info(f"Set default sender: {sender.email} (ID: {sender.id})")
    
    return sender.to_dict()
