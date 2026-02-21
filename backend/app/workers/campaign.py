import asyncio
import time
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import func

from .celery_app import celery_app
from ..db import SessionLocal
from ..models.campaign import Campaign
from ..models.campaign_contact import CampaignContact
from ..models.campaign_attachment import CampaignAttachment
from ..models.email_log import EmailLog
from ..models.sender_account import SenderAccount
from ..models.google_account import GoogleAccount
from ..services.email.smtp import SMTPSender
from ..services.email.gmail import create_gmail_service
from ..services.template_service import template_service
from ..services.email.tracking import email_tracking

logger = logging.getLogger(__name__)


def send_campaign_emails_raw(campaign_id: int, task_id: str = "sync") -> dict:
    """
    Raw function to send emails for a specific campaign.
    Can be called directly without Celery.
    
    State Machine Behavior:
    - Reads campaign.status from DB on each iteration
    - STOPPED: Exit immediately, mark remaining as skipped
    - PAUSED: Exit cleanly, can be resumed later
    - RUNNING: Continue sending
    
    Idempotent: Safe to restart - skips already sent contacts.
    """
    db: Session = SessionLocal()
    
    logger.info(f"[Campaign {campaign_id}] Worker started with task_id={task_id}")
    
    try:
        # Store task ID in campaign for tracking
        campaign = db.query(Campaign).get(campaign_id)
        if not campaign:
            logger.error(f"[Campaign {campaign_id}] Campaign not found.")
            return {"status": "error", "reason": "campaign_not_found"}
        
        # Update task ID
        campaign.celery_task_id = task_id
        db.commit()
        
        # Load sender account
        sender = None
        if campaign.sender_id:
            sender = db.query(SenderAccount).get(campaign.sender_id)
        
        if not sender:
            logger.error(f"[Campaign {campaign_id}] No sender account configured.")
            campaign.status = "failed"
            db.commit()
            return {"status": "error", "reason": "no_sender_configured"}
        
        if not sender.is_active:
            logger.error(f"[Campaign {campaign_id}] Sender account '{sender.name}' is inactive.")
            campaign.status = "failed"
            db.commit()
            return {"status": "error", "reason": "sender_inactive"}
        
        # Initialize email service based on sender type
        email_service = None
        
        if sender.type == "gmail_oauth":
            # Use Gmail API
            if not sender.google_account_id:
                logger.error(f"[Campaign {campaign_id}] Gmail OAuth sender has no Google account linked.")
                campaign.status = "failed"
                db.commit()
                return {"status": "error", "reason": "no_google_account_linked"}
            
            google_account = db.query(GoogleAccount).get(sender.google_account_id)
            if not google_account:
                logger.error(f"[Campaign {campaign_id}] Linked Google account not found.")
                campaign.status = "failed"
                db.commit()
                return {"status": "error", "reason": "google_account_not_found"}
            
            # Create Gmail service (will auto-refresh token if needed)
            email_service = create_gmail_service(google_account)
            logger.info(f"[Campaign {campaign_id}] Using Gmail API sender: {sender.name} <{sender.email}>")
            
        else:
            # Use SMTP
            # Validate SMTP credentials exist
            if not sender.smtp_host or not sender.smtp_username:
                logger.error(f"[Campaign {campaign_id}] SMTP sender missing configuration.")
                campaign.status = "failed"
                db.commit()
                return {"status": "error", "reason": "smtp_config_incomplete"}
            
            email_service = SMTPSender.from_sender_account(sender)
            logger.info(f"[Campaign {campaign_id}] Using SMTP sender: {sender.name} <{sender.email}>")
        
        # Validate campaign has required data
        if not campaign.subject_template or not campaign.body_template:
            logger.error(f"[Campaign {campaign_id}] Missing template data.")
            campaign.status = "failed"
            db.commit()
            return {"status": "error", "reason": "missing_template"}
        
        # Load attachments for this campaign
        attachments_data = []
        campaign_attachments = db.query(CampaignAttachment).filter(
            CampaignAttachment.campaign_id == campaign_id
        ).all()
        
        for attachment in campaign_attachments:
            try:
                with open(attachment.file_path, 'rb') as f:
                    content = f.read()
                    attachments_data.append({
                        "filename": attachment.filename,
                        "content": content,
                        "mime_type": attachment.mime_type
                    })
                    logger.info(f"[Campaign {campaign_id}] Loaded attachment: {attachment.filename}")
            except Exception as e:
                logger.error(f"[Campaign {campaign_id}] Failed to load attachment {attachment.filename}: {e}")
        
        # Check if there are contacts
        total_contacts = db.query(CampaignContact).filter(
            CampaignContact.campaign_id == campaign_id
        ).count()
        
        if total_contacts == 0:
            logger.warning(f"[Campaign {campaign_id}] No contacts assigned.")
            campaign.status = "failed"
            db.commit()
            return {"status": "error", "reason": "no_contacts"}
        
        # Event loop for async sending
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        emails_sent = 0
        emails_failed = 0
        emails_skipped = 0
        
        while True:
            # Refresh campaign state from DB (state machine check)
            db.refresh(campaign)
            current_status = campaign.status
            
            if current_status == "stopped":
                logger.info(f"[Campaign {campaign_id}] Campaign stopped. Exiting.")
                # Mark remaining pending as skipped
                skipped = db.query(CampaignContact).filter(
                    CampaignContact.campaign_id == campaign_id,
                    CampaignContact.status == "pending"
                ).update({"status": "skipped"}, synchronize_session=False)
                db.commit()
                logger.info(f"[Campaign {campaign_id}] Marked {skipped} contacts as skipped.")
                return {
                    "status": "stopped",
                    "sent": emails_sent,
                    "failed": emails_failed,
                    "skipped": emails_skipped + skipped
                }
            
            if current_status == "paused":
                logger.info(f"[Campaign {campaign_id}] Campaign paused. Exiting cleanly.")
                return {
                    "status": "paused",
                    "sent": emails_sent,
                    "failed": emails_failed,
                    "skipped": emails_skipped
                }
            
            if current_status != "running":
                logger.warning(f"[Campaign {campaign_id}] Unexpected status '{current_status}'. Exiting.")
                return {
                    "status": "error",
                    "reason": f"unexpected_status_{current_status}",
                    "sent": emails_sent,
                    "failed": emails_failed
                }
            
            # Check daily limit
            today = datetime.utcnow().date()
            today_start = datetime.combine(today, datetime.min.time())
            sent_today = db.query(CampaignContact).filter(
                CampaignContact.campaign_id == campaign_id,
                CampaignContact.status == "sent",
                CampaignContact.sent_at >= today_start
            ).count()
            
            if sent_today >= campaign.daily_limit:
                logger.info(f"[Campaign {campaign_id}] Daily limit reached ({sent_today}/{campaign.daily_limit}). Pausing.")
                campaign.status = "paused"
                db.commit()
                return {
                    "status": "daily_limit_reached",
                    "sent": emails_sent,
                    "failed": emails_failed
                }
            
            # Get next pending contact (one at a time for better control)
            contact_link = db.query(CampaignContact).filter(
                CampaignContact.campaign_id == campaign_id,
                CampaignContact.status == "pending"
            ).first()
            
            if not contact_link:
                # No more pending contacts - campaign complete
                logger.info(f"[Campaign {campaign_id}] All contacts processed. Completing.")
                campaign.status = "completed"
                db.commit()
                return {
                    "status": "completed",
                    "sent": emails_sent,
                    "failed": emails_failed,
                    "skipped": emails_skipped
                }
            
            # Get contact details
            contact = contact_link.contact
            if not contact:
                logger.error(f"[Campaign {campaign_id}] Contact not found for link {contact_link.id}")
                contact_link.status = "failed"
                db.commit()
                emails_failed += 1
                continue
            
            # Prepare template context
            context = {
                "FirstName": contact.first_name or "",
                "Company": contact.company or "",
                "Title": contact.title or "",
                "Email": contact.email
            }
            
            try:
                # Render templates
                subject, body_html = template_service.render(
                    campaign.subject_template,
                    campaign.body_template,
                    context
                )
                
                # Inject tracking
                tracked_body = email_tracking.inject_tracking(body_html, contact_link.id)
                
                # Send email using the appropriate service (SMTP or Gmail API)
                result = loop.run_until_complete(
                    email_service.send_email(
                        to_email=contact.email,
                        subject=subject,
                        html_body=tracked_body,
                        text_body=None,
                        attachments=attachments_data if attachments_data else None
                    )
                )
                
                # Handle result
                send_status = result.get("status")
                
                if send_status == "sent":
                    contact_link.status = "sent"
                    contact_link.sent_at = datetime.utcnow()
                    emails_sent += 1
                    
                    log_entry = EmailLog(
                        campaign_contact_id=contact_link.id,
                        message_id=result.get("message_id"),
                        subject=subject,
                        recipient=contact.email,
                        status="sent"
                    )
                    logger.info(f"[Campaign {campaign_id}] Sent to {contact.email}")
                    
                elif send_status == "bounced":
                    contact_link.status = "bounced"
                    contact_link.bounce_reason = result.get("error")
                    emails_failed += 1
                    
                    log_entry = EmailLog(
                        campaign_contact_id=contact_link.id,
                        recipient=contact.email,
                        status="bounced",
                        error_message=result.get("error")
                    )
                    logger.warning(f"[Campaign {campaign_id}] Bounced: {contact.email} - {result.get('error')}")
                    
                else:  # failed
                    error_type = result.get("type", "unknown")
                    
                    if error_type == "soft_bounce":
                        # Retryable - leave as pending for next run
                        logger.warning(f"[Campaign {campaign_id}] Soft bounce for {contact.email}, will retry")
                        log_entry = EmailLog(
                            campaign_contact_id=contact_link.id,
                            recipient=contact.email,
                            status="retry",
                            error_message=result.get("error")
                        )
                    else:
                        # Hard failure
                        contact_link.status = "failed"
                        contact_link.bounce_reason = result.get("error")
                        emails_failed += 1
                        
                        log_entry = EmailLog(
                            campaign_contact_id=contact_link.id,
                            recipient=contact.email,
                            status="failed",
                            error_message=result.get("error")
                        )
                        logger.error(f"[Campaign {campaign_id}] Failed: {contact.email} - {result.get('error')}")
                
                db.add(log_entry)
                db.commit()
                
            except Exception as e:
                logger.exception(f"[Campaign {campaign_id}] Error sending to {contact.email}: {e}")
                contact_link.status = "failed"
                contact_link.bounce_reason = str(e)
                emails_failed += 1
                db.commit()
            
            # Rate limiting delay
            time.sleep(campaign.delay_seconds or 60)
            
    except Exception as e:
        logger.exception(f"[Campaign {campaign_id}] Critical error in worker: {e}")
        # Mark campaign as failed
        try:
            campaign = db.query(Campaign).get(campaign_id)
            if campaign:
                campaign.status = "failed"
                db.commit()
        except:
            pass
        # Return error instead of raising retry (for sync mode)
        return {"status": "error", "reason": str(e)}
        
    finally:
        try:
            loop.close()
        except:
            pass
        db.close()
        logger.info(f"[Campaign {campaign_id}] Worker finished. Sent: {emails_sent}, Failed: {emails_failed}")


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_campaign_emails(self, campaign_id: int):
    """
    Celery task wrapper for send_campaign_emails_raw.
    """
    try:
        result = send_campaign_emails_raw(campaign_id, self.request.id)
        if result.get("status") == "error":
            # Retry on error
            raise self.retry(exc=Exception(result.get("reason", "Unknown error")), countdown=60)
        return result
    except Exception as e:
        logger.exception(f"[Campaign {campaign_id}] Celery task error: {e}")
        raise self.retry(exc=e, countdown=60)
