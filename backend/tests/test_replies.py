import pytest
from unittest.mock import MagicMock, patch
from app.services.email.imap import IMAPService
from app.workers.replies import check_email_replies
from app.models.email_log import EmailLog
from app.models.campaign_contact import CampaignContact
from app.models.contact import Contact

@pytest.fixture
def mock_imap_lib():
    with patch("app.services.email.imap.imaplib") as mock:
        yield mock

def test_imap_fetch_unseen(mock_imap_lib):
    # Mock IMAP connection and response
    mock_mail = MagicMock()
    mock_imap_lib.IMAP4_SSL.return_value = mock_mail
    
    # Mock search response
    mock_mail.search.return_value = ("OK", [b"1 2"])
    
    # Mock fetch response
    # Complex mock structure for email parsing, simplified for this test
    # We just want to ensure it iterates and calls fetch
    mock_mail.fetch.return_value = ("OK", []) 
    
    service = IMAPService()
    list(service.fetch_unseen_replies())
    
    mock_mail.login.assert_called()
    mock_mail.select.assert_called_with("inbox")
    mock_mail.search.assert_called_with(None, "UNSEEN")
    assert mock_mail.fetch.call_count == 2 # Once for each ID

@pytest.fixture
def mock_db():
    with patch("app.workers.replies.SessionLocal") as mock:
        yield mock

@pytest.fixture
def mock_imap_service():
    with patch("app.workers.replies.imap_service") as mock:
        yield mock

def test_check_replies_match(mock_db, mock_imap_service):
    session = mock_db.return_value
    
    # Mock reply data
    mock_imap_service.fetch_unseen_replies.return_value = [{
        "subject": "Re: Hello",
        "sender": "contact@example.com",
        "message_id": "<reply-id>",
        "in_reply_to": "<original-id>",
        "references": "<original-id>"
    }]
    
    # Mock DB findings
    contact = MagicMock(spec=Contact, email="contact@example.com")
    cc = MagicMock(spec=CampaignContact, id=1, contact=contact, status="sent", replied_at=None)
    log = MagicMock(spec=EmailLog, message_id="<original-id>", campaign_contact=cc)
    
    session.query.return_value.filter.return_value.first.return_value = log
    
    check_email_replies()
    
    # Verify status update
    assert cc.status == "replied"
    assert cc.replied_at is not None
    assert session.add.called # Event logged
    session.commit.assert_called()

def test_check_replies_no_match(mock_db, mock_imap_service):
    session = mock_db.return_value
    mock_imap_service.fetch_unseen_replies.return_value = [{
        "sender": "unknown@example.com",
        "in_reply_to": "<unknown-id>"
    }]
    
    session.query.return_value.filter.return_value.first.return_value = None
    
    check_email_replies()
    
    assert not session.add.called
    assert not session.commit.called
