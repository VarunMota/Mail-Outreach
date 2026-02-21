import pandas as pd
import io
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..models.contact import Contact
from ..utils.logging import logger
import re

class ContactService:
    @staticmethod
    def validate_email(email: str) -> bool:
        """Simple regex for email validation."""
        pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        return bool(re.match(pattern, str(email)))

    @staticmethod
    async def import_contacts_from_excel(db: Session, file_content: bytes):
        """
        Parses Excel, validates, deduplicates, and inserts contacts.
        """
        try:
            # Load Excel into DataFrame
            df = pd.read_excel(io.BytesIO(file_content))
            
            # Required columns validation
            required_cols = {"Email", "FirstName", "Company"}
            if not required_cols.issubset(df.columns):
                missing = required_cols - set(df.columns)
                raise ValueError(f"Missing required columns: {', '.join(missing)}")

            total_rows = len(df)
            inserted = 0
            skipped_duplicates = 0
            invalid_emails = 0

            # Normalize and validate
            processed_data = []
            seen_emails = set()

            for _, row in df.iterrows():
                raw_email = str(row["Email"]).strip().lower()
                
                if not ContactService.validate_email(raw_email):
                    invalid_emails += 1
                    continue
                
                if raw_email in seen_emails:
                    skipped_duplicates += 1
                    continue
                
                seen_emails.add(raw_email)
                
                # Check if exists in DB
                existing = db.query(Contact).filter(Contact.email == raw_email).first()
                if existing:
                    skipped_duplicates += 1
                    continue

                processed_data.append({
                    "email": raw_email,
                    "first_name": row.get("FirstName"),
                    "company": row.get("Company"),
                    "title": row.get("Title") if "Title" in row else None
                })

            # Bulk insert
            if processed_data:
                contacts = [Contact(**data) for data in processed_data]
                db.add_all(contacts)
                db.commit()
                inserted = len(processed_data)

            return {
                "total_rows": total_rows,
                "inserted": inserted,
                "skipped_duplicates": skipped_duplicates,
                "invalid_emails": invalid_emails
            }

        except Exception as e:
            logger.error(f"Error importing contacts: {str(e)}")
            db.rollback()
            raise e

contact_service = ContactService()
