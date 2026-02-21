from celery import shared_task
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.db import SessionLocal
from app.models import Campaign, CampaignContact, CampaignFollowup, EmailEvent
from app.services.template_service import TemplateService
from app.services.email.smtp import SMTPSender
import logging
import asyncio

logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@shared_task(name="app.workers.followup.process_followups")
def process_followups():
    """
    Check for contacts eligible for follow-up emails and send them.
    Rules:
    - If trigger is 'no_open': check if last email was opened.
    - If trigger is 'no_reply': check if contact replied.
    - Must wait 'delay_days' since last email sent.
    """
    db = SessionLocal()
    try:
        logger.info("Starting follow-up processing...")
        
        # Get active campaigns with followups
        active_campaigns = db.query(Campaign).filter(Campaign.status == "active").all()
        
        for campaign in active_campaigns:
            if not campaign.followups:
                continue
                
            logger.info(f"Processing follow-ups for campaign {campaign.id}: {campaign.name}")
            
            # Sort followups by step number
            sorted_followups = sorted(campaign.followups, key=lambda f: f.step_number)
            
            for contact_assoc in campaign.contacts:
                # Skip if contact is not in a valid state for follow-up
                if contact_assoc.status in ["bounced", "replied", "unsubscribed"]:
                    continue
                
                # Determine next step
                current_step = contact_assoc.last_step_sent
                next_step_number = current_step + 1
                
                # Find the followup config for the next step
                followup_config = next(
                    (f for f in sorted_followups if f.step_number == next_step_number), 
                    None
                )
                
                if not followup_config:
                    continue  # No more steps for this contact
                
                # Check delay
                if not contact_assoc.sent_at:
                    continue # Should track sent_at of last step. For now assume sent_at is last email.
                    # TODO: Ideally we should track sent_at per step. 
                    # For simplicity, let's use contact_assoc.sent_at which updates on every send.
                
                time_since_last_send = datetime.utcnow() - contact_assoc.sent_at
                if time_since_last_send < timedelta(days=followup_config.delay_days):
                    continue # Not enough time passed
                
                # Check trigger condition
                should_send = False
                if followup_config.trigger_condition == "no_open":
                    # If not opened yet
                    if not contact_assoc.opened_at:
                        should_send = True
                        
                elif followup_config.trigger_condition == "no_reply":
                    # If not replied yet (already checked specific status above, but double check date)
                    if not contact_assoc.replied_at:
                        should_send = True
                
                if should_send:
                    logger.info(f"Sending follow-up step {next_step_number} to contact {contact_assoc.contact.email}")
                    send_followup_email(db, campaign, followup_config, contact_assoc)

    except Exception as e:
        logger.error(f"Error processing follow-ups: {str(e)}")
    finally:
        db.close()

def send_followup_email(db: Session, campaign: Campaign, followup: CampaignFollowup, contact_assoc: CampaignContact):
    try:
        contact = contact_assoc.contact
        
        # Render Schema
        context = {
            "FirstName": contact.first_name,
            "LastName": contact.last_name,
            "Company": contact.company,
            "Title": contact.title
        }
        
        subject = TemplateService.render(followup.subject_template, context)
        body = TemplateService.render(followup.body_template, context)
        
        # Send Email
        sender = SMTPSender()
        # Need to run async method in sync task
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # Use existing campaign_contact_id for tracking to keep history linked? 
        # Or should we insert a new log entry? unique ID is needed for tracking pixel.
        # Let's use the same campaign_contact ID for simplicity but update timestamps.
        
        result = loop.run_until_complete(
            sender.send_email(
                to_email=contact.email,
                subject=subject,
                html_content=body,
                campaign_contact_id=contact_assoc.id
            )
        )
        loop.close()
        
        if result["status"] == "sent":
            # Update Contact State
            contact_assoc.last_step_sent = followup.step_number
            contact_assoc.sent_at = datetime.utcnow() # Reset timer for next delay
            contact_assoc.status = "sent" # Reset status to sent, waiting for new open/reply
            db.commit()
            logger.info(f"Successfully sent follow-up to {contact.email}")
        else:
            logger.error(f"Failed to send follow-up: {result.get('error')}")

    except Exception as e:
        logger.error(f"Error sending follow-up email: {str(e)}")
