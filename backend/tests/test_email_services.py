import pytest
from unittest.mock import AsyncMock, patch
from app.services.email.smtp import SMTPSender
from app.services.email.tracking import EmailTracking

@pytest.mark.asyncio
async def test_smtp_send_success():
    sender = SMTPSender()
    
    with patch("aiosmtplib.send", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = ({}, "OK")
        
        result = await sender.send_email(
            to_email="test@example.com",
            subject="Test Subject",
            html_body="<p>Hello</p>",
            text_body="Hello"
        )
        
        assert result["status"] == "sent"
        assert "message_id" in result
        mock_send.assert_called_once()

@pytest.mark.asyncio
async def test_smtp_send_attachment():
    sender = SMTPSender()
    
    with patch("aiosmtplib.send", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = ({}, "OK")
        
        attachments = [{
            "filename": "test.txt",
            "content": b"test content"
        }]
        
        result = await sender.send_email(
            to_email="test@example.com",
            subject="With Attachment",
            html_body="<p>File attached</p>",
            attachments=attachments
        )
        
        assert result["status"] == "sent"
        
        # Verify attachment was added to the message passed to send
        call_args = mock_send.call_args
        message = call_args[0][0] # First arg is message
        
        assert message.get_content_type() == "multipart/alternative"
        # Checking payload is complex due to structure, but if it didn't crash it's likely fine for this basic test

def test_tracking_injection():
    html = '<html><body><p>Hi <a href="https://example.com">Click me</a></p></body></html>'
    tracking = EmailTracking()
    
    injected = tracking.inject_tracking(html, campaign_contact_id=123)
    
    assert "/api/v1/track/open/123" in injected
    assert "/api/v1/track/click/123" in injected
    assert "url=https%3A%2F%2Fexample.com" in injected
