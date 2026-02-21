from datetime import datetime
from sqlalchemy.orm import Session
from .celery_app import celery_app
from ..db import SessionLocal
from ..models.campaign_contact import CampaignContact
from ..models.email_log import EmailLog
from ..models.email_event import EmailEvent
from ..services.email.imap import imap_service
from ..utils.logging import logger

@celery_app.task
def check_email_replies():
    """
    Celery task to check Inbox for replies and map them to campaigns.
    """
    db: Session = SessionLocal()
    try:
        replies = imap_service.fetch_unseen_replies()
        
        for reply in replies:
            in_reply_to = reply.get("in_reply_to")
            references = reply.get("references")
            sender = reply.get("sender")

            logger.info(f"Processing reply from {sender} (In-Reply-To: {in_reply_to})")

            # Try to match via In-Reply-To header against EmailLog values
            # Need to clean string, sometimes contains <>
            
            # Simple match attempts
            matched_log = None
            
            # Strategy 1: strict match on message_id
            if in_reply_to:
                clean_id = in_reply_to.strip().strip("<>")
                matched_log = db.query(EmailLog).filter(EmailLog.message_id.ilike(f"%{clean_id}%")).first()

            # Strategy 2: If no match, check references (conversation history)
            # references is usually space separated list of IDs
            if not matched_log and references:
                ref_ids = references.split()
                for ref in ref_ids:
                    clean_ref = ref.strip().strip("<>")
                    matched_log = db.query(EmailLog).filter(EmailLog.message_id.ilike(f"%{clean_ref}%")).first()
                    if matched_log:
                        break

            if matched_log:
                # Found the original email!
                contact_link = matched_log.campaign_contact
                
                # Double check sender matches contact email (optional security)
                if contact_link.contact.email.lower() == sender.lower():
                    logger.info(f"Matched reply to contact {contact_link.contact.email}")
                    
                    # Update status
                    if not contact_link.replied_at:
                        contact_link.replied_at = datetime.utcnow()
                        contact_link.status = "replied"
                    
                    # Log event
                    event = EmailEvent(
                        campaign_contact_id=contact_link.id,
                        type="reply",
                        timestamp=datetime.utcnow(),
                        metadata={
                            "subject": reply.get("subject"),
                            "message_id": reply.get("message_id")
                        }
                    )
                    db.add(event)
                    db.commit()
                else:
                    logger.warning(f"Reply matched thread but sender mismatch: {sender} != {contact_link.contact.email}")
            else:
                logger.info("No matching campaign email found for this reply.")

    except Exception as e:
        logger.error(f"Error checking replies: {e}")
    finally:
        db.close()
