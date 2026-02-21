import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.workers.campaign import send_campaign_emails
from app.models.campaign import Campaign
from app.models.campaign_contact import CampaignContact
from app.models.contact import Contact
from datetime import datetime

@pytest.fixture
def mock_db():
    with patch("app.workers.campaign.SessionLocal") as mock:
        yield mock

@pytest.fixture
def mock_smtp():
    with patch("app.workers.campaign.smtp_sender.send_email", new_callable=AsyncMock) as mock:
        yield mock

def test_campaign_not_found(mock_db):
    session = mock_db.return_value
    session.query.return_value.get.return_value = None
    
    send_campaign_emails(999)
    
    # Should exit early
    session.query.return_value.get.assert_called_with(999)

def test_daily_limit_reached(mock_db):
    session = mock_db.return_value
    campaign = MagicMock(spec=Campaign, id=1, daily_limit=10, status="active", delay_seconds=0)
    session.query.return_value.get.return_value = campaign
    
    # Simulate blocked by limit
    session.query.return_value.filter.return_value.count.return_value = 10
    
    send_campaign_emails(1)
    
    # Should check pending contacts NOT called
    assert session.query.return_value.filter.return_value.limit.called is False

def test_send_success(mock_db, mock_smtp):
    session = mock_db.return_value
    campaign = MagicMock(spec=Campaign, id=1, daily_limit=100, status="active", delay_seconds=0, 
                         subject_template="Hi {{FirstName}}", body_template="Body")
    session.query.return_value.get.return_value = campaign
    
    # sent_today = 0
    session.query.return_value.filter.return_value.count.return_value = 0
    
    # Pending contacts
    contact = MagicMock(spec=Contact, email="test@example.com", first_name="John")
    cc = MagicMock(spec=CampaignContact, id=1, contact=contact, status="pending")
    session.query.return_value.filter.return_value.limit.return_value.all.return_value = [cc]
    
    # Mock SMTP response
    mock_smtp.return_value = {"status": "sent", "message_id": "123"}
    
    send_campaign_emails(1)
    
    # Verify email sent
    mock_smtp.assert_called_once()
    assert cc.status == "sent"
    assert session.add.called # Log entry added
    session.commit.assert_called()
