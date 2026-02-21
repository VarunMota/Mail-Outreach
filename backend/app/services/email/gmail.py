"""Gmail API email sending service."""
import base64
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.utils import make_msgid
from typing import Optional, Dict, Any

from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

from ...config import settings
from ...models.google_account import GoogleAccount
from ...utils.logging import logger


class GmailSendService:
    """Send emails using Gmail API."""
    
    def __init__(self, google_account: GoogleAccount):
        """
        Initialize with GoogleAccount.
        Will refresh token if expired.
        """
        self.google_account = google_account
        self.credentials = self._get_credentials()
        self.service = build('gmail', 'v1', credentials=self.credentials)
    
    def _get_credentials(self) -> Credentials:
        """Get valid credentials, refreshing if necessary."""
        # Check if token needs refresh
        if self.google_account.is_token_expired():
            logger.info(f"Token expired for {self.google_account.gmail_email}, refreshing...")
            self._refresh_token()
        
        return Credentials(
            token=self.google_account.access_token,
            refresh_token=self.google_account.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=settings.GOOGLE_SCOPES.split()
        )
    
    def _refresh_token(self) -> bool:
        """Refresh the access token. Returns True if successful."""
        from ..google_oauth import google_oauth_service
        
        result = google_oauth_service.refresh_access_token(
            self.google_account.refresh_token
        )
        
        if result:
            self.google_account.access_token = result["access_token"]
            self.google_account.token_expiry = result["token_expiry"]
            # Commit is handled by caller or session
            logger.info(f"Token refreshed for {self.google_account.gmail_email}")
            return True
        else:
            logger.error(f"Failed to refresh token for {self.google_account.gmail_email}")
            return False
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        attachments: Optional[list] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Send email using Gmail API.
        Returns dict with status and message_id.
        """
        try:
            # Build RFC822 message
            message = MIMEMultipart("alternative")
            message["From"] = self.google_account.gmail_email
            message["To"] = to_email
            message["Subject"] = subject
            
            # Generate Message-ID
            msg_id = make_msgid(domain="gmail.com")
            message["Message-ID"] = msg_id
            
            # Add custom headers
            if headers:
                for key, value in headers.items():
                    message[key] = value
            
            # Attach text body
            if text_body:
                message.attach(MIMEText(text_body, "plain"))
            
            # Attach HTML body
            if html_body:
                message.attach(MIMEText(html_body, "html"))
            
            # Process attachments
            if attachments:
                for attachment in attachments:
                    content = attachment["content"]
                    if isinstance(content, str):
                        content = content.encode('utf-8')
                    
                    part = MIMEApplication(content, Name=attachment["filename"])
                    part['Content-Disposition'] = f'attachment; filename="{attachment["filename"]}"'
                    message.attach(part)
            
            # Encode to base64
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            
            # Send via Gmail API
            result = self.service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()
            
            message_id = result.get('id')
            logger.info(f"Email sent via Gmail API to {to_email}, message_id: {message_id}")
            
            return {
                "status": "sent",
                "message_id": message_id,
                "provider": "gmail_api"
            }
            
        except Exception as e:
            error_str = str(e).lower()
            logger.error(f"Gmail API send failed: {e}")
            
            # Classify errors
            if "invalid_grant" in error_str or "token" in error_str:
                return {
                    "status": "failed",
                    "error": "Authentication failed. Please reconnect Gmail account.",
                    "type": "auth_error"
                }
            elif "rate limit" in error_str or "quota" in error_str:
                return {
                    "status": "failed",
                    "error": "Rate limit exceeded. Please try again later.",
                    "type": "rate_limit"
                }
            else:
                return {
                    "status": "failed",
                    "error": str(e),
                    "type": "unknown"
                }
    
    def get_profile(self) -> Dict[str, Any]:
        """Get Gmail profile info."""
        try:
            profile = self.service.users().getProfile(userId='me').execute()
            return {
                "email": profile.get('emailAddress'),
                "messages_total": profile.get('messagesTotal'),
                "threads_total": profile.get('threadsTotal'),
                "history_id": profile.get('historyId')
            }
        except Exception as e:
            logger.error(f"Failed to get Gmail profile: {e}")
            return {}


def create_gmail_service(google_account: GoogleAccount) -> GmailSendService:
    """Factory function to create GmailSendService."""
    return GmailSendService(google_account)
