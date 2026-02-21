from jinja2 import Environment, FileSystemLoader, select_autoescape
import os
from ...config import settings

class EmailService:
    def __init__(self):
        template_dir = os.path.join(os.path.dirname(__file__), "templates")
        self.env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )

    def render_template(self, template_name: str, **context):
        template = self.env.get_context(template_name)
        return template.render(**context)

    async def send_email(self, email_to: str, subject: str, template_name: str, **context):
        # Implementation for sending email (e.g., using a background task)
        body = self.render_template(template_name, **context)
        # Here you would typically interface with an SMTP server or API (SendGrid, Mailgun, etc.)
        # For now, we'll just log it
        print(f"Sending email to {email_to} with subject '{subject}'")
        # In production, use a library like `emails` or `fastapi-mail`
        return body

email_service = EmailService()
