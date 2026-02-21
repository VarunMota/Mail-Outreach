from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List
from ....db import get_db
from ....services.contact_service import contact_service
from ....schemas.contact import ContactImportSummary, ContactResponse
from ....models.contact import Contact

router = APIRouter()


@router.get("/", response_model=List[ContactResponse])
def list_contacts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query(None, description="Search by email, first name, or company"),
    db: Session = Depends(get_db)
):
    """
    List all contacts with optional search filtering.
    """
    query = db.query(Contact)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Contact.email.ilike(search_term)) |
            (Contact.first_name.ilike(search_term)) |
            (Contact.company.ilike(search_term))
        )
    
    contacts = query.order_by(Contact.created_at.desc()).offset(skip).limit(limit).all()
    return contacts


@router.get("/count")
def get_contacts_count(db: Session = Depends(get_db)):
    """
    Get total count of contacts.
    """
    count = db.query(Contact).count()
    return {"count": count}


@router.post("/upload", response_model=ContactImportSummary)
async def upload_contacts(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Endpoint to upload an Excel file and import contacts.
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload an Excel file.")

    content = await file.read()
    try:
        summary = await contact_service.import_contacts_from_excel(db, content)
        return summary
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error during import.")
