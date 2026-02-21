from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ....db import get_db
from ....models.user import User
from ....schemas.user import UserRead, UserCreate  # I'll create these next

router = APIRouter()

@router.get("/", response_model=list[UserRead])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.post("/", response_model=UserRead)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    user = User(email=user_in.email, hashed_password="fakehashedpassword", full_name=user_in.full_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
