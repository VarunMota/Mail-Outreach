import imaplib
import email
from email.header import decode_header
from ...config import settings
from ...utils.logging import logger
import re

class IMAPService:
    def __init__(self):
        self.host = settings.IMAP_HOST
        self.port = settings.IMAP_PORT
        self.username = settings.IMAP_USER or settings.SMTP_USER
        self.password = settings.IMAP_PASSWORD or settings.SMTP_PASSWORD

    def fetch_unseen_replies(self):
        """
        Connects to IMAP, fetches unseen emails, and yields parsed reply data.
        """
        mail = None
        try:
            mail = imaplib.IMAP4_SSL(self.host, self.port)
            mail.login(self.username, self.password)
            mail.select("inbox")

            # Search for unseen emails
            status, messages = mail.search(None, "UNSEEN")
            if status != "OK" or not messages[0]:
                return

            for num in messages[0].split():
                try:
                    # Fetch headers only first to filter
                    # RFC822.HEADER
                    status, msg_data = mail.fetch(num, "(RFC822)")
                    for response_part in msg_data:
                        if isinstance(response_part, tuple):
                            msg = email.message_from_bytes(response_part[1])
                            
                            # Parse Headers
                            subject, encoding = decode_header(msg.get("Subject", ""))[0]
                            if isinstance(subject, bytes):
                                subject = subject.decode(encoding or "utf-8")
                            
                            sender = msg.get("From")
                            message_id = msg.get("Message-ID")
                            in_reply_to = msg.get("In-Reply-To")
                            references = msg.get("References")

                            # Extract email from sender "Name <email@example.com>"
                            sender_email = sender
                            if "<" in sender:
                                sender_email = sender.split("<")[1].strip(">")

                            yield {
                                "subject": subject,
                                "sender": sender_email,
                                "message_id": message_id,
                                "in_reply_to": in_reply_to,
                                "references": references,
                                "uid": num # Could be used to mark read later
                            }
                            
                            # Mark as seen happens automatically when fetching content usually, 
                            # but with peek it might not. Here we fetched RFC822 so it should be marked SEEN.

                except Exception as e:
                    logger.error(f"Error parsing email {num}: {e}")
                    continue

        except Exception as e:
            logger.error(f"IMAP Connection Error: {e}")
        finally:
            if mail:
                try:
                    mail.close()
                    mail.logout()
                except:
                    pass

imap_service = IMAPService()
