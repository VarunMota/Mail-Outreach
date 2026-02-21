from sqlalchemy import Column, String, Text
from .base import TimestampModel

class Template(TimestampModel):
    __tablename__ = "templates"

    name = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body_html = Column(Text)
    body_text = Column(Text)
