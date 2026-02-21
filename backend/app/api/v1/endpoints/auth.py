"""Authentication endpoints for Google OAuth."""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import jwt
from typing import Optional

from ....db import get_db
from ....config import settings
from ....models.user import User
from ....models.google_account import GoogleAccount
from ....models.sender_account import SenderAccount
from ....schemas.auth import (
    TokenResponse, 
    GoogleAuthCallback, 
    AuthStatusResponse,
    GoogleConnectResponse,
    UserResponse
)
from ....services.google_oauth import google_oauth_service
from ....utils.logging import logger

router = APIRouter()


def create_jwt_token(user_id: int) -> tuple[str, int]:
    """Create JWT token for user. Returns (token, expires_in_seconds)."""
    expires_in = settings.JWT_EXPIRATION_HOURS * 3600
    expires_at = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    
    payload = {
        "user_id": user_id,
        "exp": expires_at,
        "iat": datetime.utcnow(),
        "type": "access"
    }
    
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, expires_in


def decode_jwt_token(token: str) -> Optional[dict]:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """Get current user from JWT token in Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.split(" ")[1]
    payload = decode_jwt_token(token)
    
    if not payload:
        return None
    
    user_id = payload.get("user_id")
    if not user_id:
        return None
    
    return db.query(User).get(user_id)


def get_current_user_required(
    request: Request, 
    db: Session = Depends(get_db)
) -> User:
    """Get current user or raise 401."""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user


@router.get("/google/login")
def google_login():
    """Redirect to Google OAuth login."""
    auth_url, state = google_oauth_service.get_authorization_url()
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
def google_callback(
    code: str,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Handle Google OAuth callback."""
    if error:
        logger.error(f"Google OAuth error: {error}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google OAuth error: {error}"
        )
    
    try:
        # Exchange code for tokens
        token_info = google_oauth_service.exchange_code(code)
        userinfo = token_info["userinfo"]
        
        # Check if user exists
        user = db.query(User).filter(User.email == userinfo["email"]).first()
        
        if not user:
            # Create new user
            user = User(
                email=userinfo["email"],
                name=userinfo.get("name"),
                google_sub=userinfo["id"],
                picture_url=userinfo.get("picture"),
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Created new user: {user.email}")
        else:
            # Update user info
            user.name = userinfo.get("name") or user.name
            user.google_sub = userinfo["id"]
            user.picture_url = userinfo.get("picture") or user.picture_url
            user.last_login_at = datetime.utcnow()
            db.commit()
            logger.info(f"Updated existing user: {user.email}")
        
        # Create or update GoogleAccount
        google_account = db.query(GoogleAccount).filter(
            GoogleAccount.user_id == user.id
        ).first()
        
        if not google_account:
            google_account = GoogleAccount(
                user_id=user.id,
                gmail_email=userinfo["email"],
                scope=token_info["scope"] if isinstance(token_info["scope"], str) else " ".join(token_info["scope"]),
                token_expiry=token_info["token_expiry"]
            )
            db.add(google_account)
        
        # Update tokens (encrypted)
        google_account.access_token = token_info["access_token"]
        if token_info.get("refresh_token"):
            google_account.refresh_token = token_info["refresh_token"]
        google_account.token_expiry = token_info["token_expiry"]
        google_account.gmail_email = userinfo["email"]
        
        db.commit()
        db.refresh(google_account)
        
        # Auto-create Gmail OAuth sender account if it doesn't exist
        sender_account = db.query(SenderAccount).filter(
            SenderAccount.email == userinfo["email"],
            SenderAccount.type == "gmail_oauth"
        ).first()
        
        if not sender_account:
            sender_account = SenderAccount(
                name=f"{userinfo.get('name', userinfo['email'])}'s Gmail",
                email=userinfo["email"],
                type="gmail_oauth",
                google_account_id=google_account.id,
                smtp_host="smtp.gmail.com",
                smtp_port=465,
                smtp_username=userinfo["email"],
                smtp_password="",  # Not needed for OAuth
                smtp_use_tls=True,
                is_active=True,
                is_default=True,
                daily_limit=100
            )
            db.add(sender_account)
            db.commit()
            logger.info(f"Auto-created Gmail OAuth sender account for {userinfo['email']}")
        else:
            # Update the google_account_id link if not set
            if not sender_account.google_account_id:
                sender_account.google_account_id = google_account.id
                db.commit()
                logger.info(f"Updated sender account with Google account link for {userinfo['email']}")
        
        # Create JWT token
        jwt_token, expires_in = create_jwt_token(user.id)
        
        # Redirect to frontend with token
        # You can customize this URL
        frontend_url = f"http://localhost:5173/auth/callback?token={jwt_token}"
        return RedirectResponse(url=frontend_url)
        
    except Exception as e:
        logger.error(f"Google callback error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )


@router.get("/status", response_model=AuthStatusResponse)
def auth_status(current_user: Optional[User] = Depends(get_current_user)):
    """Get current authentication status."""
    if not current_user:
        return AuthStatusResponse(is_authenticated=False)
    
    google_account = current_user.google_account
    
    return AuthStatusResponse(
        is_authenticated=True,
        user=current_user.to_dict(),
        has_google_connected=google_account is not None,
        google_email=google_account.gmail_email if google_account else None
    )


@router.post("/logout")
def logout():
    """Logout (client should discard token)."""
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user_required)):
    """Get current user info."""
    return current_user.to_dict()


@router.post("/google/disconnect", response_model=GoogleConnectResponse)
def disconnect_google(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Disconnect Google account."""
    google_account = db.query(GoogleAccount).filter(
        GoogleAccount.user_id == current_user.id
    ).first()
    
    if not google_account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Google account connected"
        )
    
    # Revoke token
    google_oauth_service.revoke_token(google_account.access_token)
    
    # Delete account
    db.delete(google_account)
    db.commit()
    
    logger.info(f"Disconnected Google account for user: {current_user.email}")
    
    return GoogleConnectResponse(
        success=True,
        email=current_user.email,
        message="Google account disconnected successfully"
    )
