import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.utils import make_msgid
from typing import TYPE_CHECKING

from ...config import settings
from ...utils.logging import logger

if TYPE_CHECKING:
    from ...models.sender_account import SenderAccount


class SMTPSender:
    """SMTP Sender that can use either env config or SenderAccount from DB."""
    
    def __init__(self, sender_account: "SenderAccount" = None):
        """
        Initialize SMTP sender.
        
        Args:
            sender_account: Optional SenderAccount model instance from DB.
                          If not provided, falls back to env config.
        """
        self._sender = sender_account
        
        if sender_account:
            # Use DB sender account
            self.hostname = sender_account.smtp_host
            self.port = sender_account.smtp_port
            self.username = sender_account.smtp_username
            self.password = sender_account.smtp_password
            self.from_email = f"{sender_account.name} <{sender_account.email}>"
            self.use_tls = sender_account.smtp_use_tls
        else:
            # Fallback to env config (legacy mode)
            self.hostname = settings.SMTP_HOST
            self.port = settings.SMTP_PORT
            self.username = settings.SMTP_USER
            self.password = settings.SMTP_PASSWORD
            self.from_email = f"{settings.EMAILS_FROM_NAME} <{self.username}>"
            self.use_tls = True  # Default for env-based config

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str = None,
        attachments: list[dict] = None,
        headers: dict = None
    ) -> dict:
        """
        Sends an email using configured SMTP.
        Returns a dict with 'status' (sent/failed/bounced) and 'message_id' or 'error'.
        """
        message = MIMEMultipart("alternative")
        message["From"] = self.from_email
        message["To"] = to_email
        message["Subject"] = subject
        
        # Generate and set Message-ID
        msg_id = make_msgid(domain=self.hostname)
        message["Message-ID"] = msg_id

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

        try:
            # Determine TLS/SSL settings based on port and config
            use_tls = self.use_tls if self.port == 465 else False
            start_tls = self.use_tls if self.port == 587 else False
            
            await aiosmtplib.send(
                message,
                hostname=self.hostname,
                port=self.port,
                username=self.username,
                password=self.password,
                use_tls=use_tls,
                start_tls=start_tls
            )
            
            return {"status": "sent", "message_id": msg_id}

        except aiosmtplib.SMTPRecipientsRefused as e:
            logger.warning(f"SMTP Recipient Refused: {e}")
            return {"status": "bounced", "error": str(e), "type": "hard_bounce"}
        
        except aiosmtplib.SMTPResponseException as e:
            error_code = e.code
            error_type = "hard_bounce" if 500 <= error_code < 600 else "soft_bounce"
            logger.error(f"SMTP Error {error_code}: {e}")
            return {"status": "failed", "error": str(e), "type": error_type}

        except Exception as e:
            logger.error(f"General SMTP Error: {e}")
            return {"status": "failed", "error": str(e), "type": "unknown"}

    @classmethod
    def from_sender_account(cls, sender_account: "SenderAccount") -> "SMTPSender":
        """Factory method to create SMTPSender from a SenderAccount."""
        return cls(sender_account=sender_account)


# Legacy singleton for backward compatibility
smtp_sender = SMTPSender()
