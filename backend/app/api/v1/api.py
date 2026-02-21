from fastapi import APIRouter
from .endpoints import users, contacts, tracking, campaigns, senders, auth

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(contacts.router, prefix="/contacts", tags=["contacts"])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])
api_router.include_router(tracking.router, prefix="/track", tags=["tracking"])
api_router.include_router(senders.router, prefix="/senders", tags=["senders"])
