from fastapi import APIRouter, Depends, Response, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import List, Optional
from ....db import get_db
from ....models.campaign_contact import CampaignContact
from ....models.email_event import EmailEvent
from ....models.campaign import Campaign
from ....utils.logging import logger

router = APIRouter()

# 1x1 transparent PNG
TRANSPARENT_PIXEL = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'

def is_proxy_request(user_agent: str) -> bool:
    """
    Detect if the request is from a proxy/preload service.
    
    Common proxy signatures:
    - GoogleImageProxy (Gmail)
    - Google-Proxy
    - AppleWebKit with suspicious patterns
    - Outlook Safelinks
    """
    if not user_agent:
        return False
    
    ua_lower = user_agent.lower()
    
    proxy_signatures = [
        "googleimageproxy",
        "google-proxy",
        "gmailimageproxy",
        "outlook",
        "safelinks",
        "yahoomailproxy",
    ]
    
    return any(sig in ua_lower for sig in proxy_signatures)

def get_client_ip(request: Request) -> str:
    """
    Extract client IP from request, handling proxies.
    """
    # Check for forwarded headers (when behind proxy/load balancer)
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, take the first one
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip
    
    # Fallback to direct connection
    if request.client:
        return request.client.host
    
    return "unknown"

@router.get("/open/{campaign_contact_id}")
def track_open(
    campaign_contact_id: int, 
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Tracks an email open event and returns a transparent 1x1 PNG.
    
    Features:
    - Logs IP address and User-Agent
    - Detects proxy/preload behavior
    - Tracks open count
    - Sets cache-busting headers
    """
    try:
        # Extract request metadata
        ip_address = get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        is_proxy = is_proxy_request(user_agent)
        
        logger.info(f"[Track Open] campaign_contact_id={campaign_contact_id}, ip={ip_address}, ua={user_agent[:50]}..., proxy={is_proxy}")
        
        contact_link = db.query(CampaignContact).get(campaign_contact_id)
        if contact_link:
            # Log the event with metadata
            event_metadata = {
                "ip_address": ip_address,
                "user_agent": user_agent,
                "is_proxy": is_proxy,
            }
            
            event = EmailEvent(
                campaign_contact_id=campaign_contact_id,
                type="open",
                timestamp=datetime.utcnow(),
                metadata_json=event_metadata
            )
            db.add(event)

            # Update opened_at if first time
            if not contact_link.opened_at:
                contact_link.opened_at = datetime.utcnow()
                contact_link.status = "opened"
                logger.info(f"[Track Open] First open for campaign_contact_id={campaign_contact_id}")
            
            # Increment open count (track multiple opens)
            # Note: CampaignContact doesn't have open_count field, we'll track via events
            
            db.commit()
        else:
            logger.warning(f"[Track Open] CampaignContact not found: {campaign_contact_id}")
            
    except Exception as e:
        # Fail silently to avoid breaking the image load for the user
        logger.exception(f"[Track Open] Error tracking open for {campaign_contact_id}: {e}")

    # Return transparent pixel with cache-busting headers
    return Response(
        content=TRANSPARENT_PIXEL, 
        media_type="image/png",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Content-Disposition": "inline",
        }
    )

@router.get("/click/{campaign_contact_id}")
def track_click(
    campaign_contact_id: int, 
    url: str, 
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Tracks an email click event and redirects to the original URL.
    
    Features:
    - Logs IP address and User-Agent
    - Tracks click timestamp
    """
    try:
        # Extract request metadata
        ip_address = get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        
        logger.info(f"[Track Click] campaign_contact_id={campaign_contact_id}, url={url[:50]}..., ip={ip_address}")
        
        contact_link = db.query(CampaignContact).get(campaign_contact_id)
        if contact_link:
            # Log the event with metadata
            event_metadata = {
                "url": url,
                "ip_address": ip_address,
                "user_agent": user_agent,
            }
            
            event = EmailEvent(
                campaign_contact_id=campaign_contact_id,
                type="click",
                timestamp=datetime.utcnow(),
                metadata_json=event_metadata
            )
            db.add(event)

            # Update clicked_at if first time
            if not contact_link.clicked_at:
                contact_link.clicked_at = datetime.utcnow()
                # Update status to clicked (higher engagement than opened)
                contact_link.status = "clicked"
                logger.info(f"[Track Click] First click for campaign_contact_id={campaign_contact_id}")
            
            db.commit()
        else:
            logger.warning(f"[Track Click] CampaignContact not found: {campaign_contact_id}")
            
    except Exception as e:
        # Log error but still redirect
        logger.exception(f"[Track Click] Error tracking click for {campaign_contact_id}: {e}")

    return Response(status_code=307, headers={"Location": url})


@router.get("/stats/{campaign_id}")
def get_tracking_stats(campaign_id: int, db: Session = Depends(get_db)):
    """
    Get email tracking statistics for a campaign.
    
    Returns:
    - Total contacts
    - Sent count
    - Open count (unique + total events)
    - Click count (unique + total events)
    - Open rate
    - Click rate
    """
    campaign = db.query(Campaign).get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get base contact stats
    total_contacts = db.query(CampaignContact).filter(
        CampaignContact.campaign_id == campaign_id
    ).count()
    
    sent_count = db.query(CampaignContact).filter(
        CampaignContact.campaign_id == campaign_id,
        CampaignContact.status.in_(["sent", "opened", "clicked", "replied", "bounced"])
    ).count()
    
    unique_opens = db.query(CampaignContact).filter(
        CampaignContact.campaign_id == campaign_id,
        CampaignContact.opened_at.isnot(None)
    ).count()
    
    unique_clicks = db.query(CampaignContact).filter(
        CampaignContact.campaign_id == campaign_id,
        CampaignContact.clicked_at.isnot(None)
    ).count()
    
    # Get total event counts
    total_opens = db.query(EmailEvent).filter(
        EmailEvent.campaign_contact_id.in_(
            db.query(CampaignContact.id).filter(CampaignContact.campaign_id == campaign_id)
        ),
        EmailEvent.type == "open"
    ).count()
    
    total_clicks = db.query(EmailEvent).filter(
        EmailEvent.campaign_contact_id.in_(
            db.query(CampaignContact.id).filter(CampaignContact.campaign_id == campaign_id)
        ),
        EmailEvent.type == "click"
    ).count()
    
    # Get proxy vs real opens
    proxy_opens = db.query(EmailEvent).filter(
        EmailEvent.campaign_contact_id.in_(
            db.query(CampaignContact.id).filter(CampaignContact.campaign_id == campaign_id)
        ),
        EmailEvent.type == "open",
        EmailEvent.metadata_json.contains({"is_proxy": True})
    ).count()
    
    # Calculate rates
    open_rate = (unique_opens / sent_count * 100) if sent_count > 0 else 0
    click_rate = (unique_clicks / sent_count * 100) if sent_count > 0 else 0
    
    return {
        "campaign_id": campaign_id,
        "total_contacts": total_contacts,
        "sent_count": sent_count,
        "unique_opens": unique_opens,
        "total_opens": total_opens,
        "proxy_opens": proxy_opens,
        "unique_clicks": unique_clicks,
        "total_clicks": total_clicks,
        "open_rate": round(open_rate, 2),
        "click_rate": round(click_rate, 2),
    }


@router.get("/events/{campaign_contact_id}")
def get_contact_events(
    campaign_contact_id: int, 
    event_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get tracking events for a specific campaign contact.
    
    Optional filter by event_type: open, click, reply, bounce
    """
    query = db.query(EmailEvent).filter(
        EmailEvent.campaign_contact_id == campaign_contact_id
    )
    
    if event_type:
        query = query.filter(EmailEvent.type == event_type)
    
    events = query.order_by(EmailEvent.timestamp.desc()).all()
    
    return [
        {
            "id": event.id,
            "type": event.type,
            "timestamp": event.timestamp,
            "metadata": event.metadata_json,
        }
        for event in events
    ]
