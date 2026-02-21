"""Google OAuth service for handling authentication flow."""
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import requests

from ..config import settings
from ..utils.logging import logger


class GoogleOAuthService:
    """Handles Google OAuth2 flow and token management."""
    
    SCOPES = settings.GOOGLE_SCOPES.split()
    
    @classmethod
    def create_flow(cls, redirect_uri: Optional[str] = None, scopes: Optional[list] = None) -> Flow:
        """Create OAuth flow instance."""
        client_config = {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri or settings.GOOGLE_REDIRECT_URI],
            }
        }
        
        # Use provided scopes or default SCOPES
        flow_scopes = scopes if scopes else cls.SCOPES
        
        flow = Flow.from_client_config(
            client_config,
            scopes=flow_scopes,
            redirect_uri=redirect_uri or settings.GOOGLE_REDIRECT_URI
        )
        return flow
    
    @classmethod
    def get_authorization_url(cls, state: Optional[str] = None) -> tuple[str, str]:
        """
        Generate authorization URL for Google OAuth.
        Returns (auth_url, state)
        """
        flow = cls.create_flow()
        
        auth_url, generated_state = flow.authorization_url(
            access_type='offline',  # Request refresh token
            include_granted_scopes='true',
            prompt='consent',  # Force consent screen to get refresh token
            state=state
        )
        
        logger.info(f"Generated Google OAuth URL with state: {generated_state}")
        return auth_url, generated_state
    
    @classmethod
    def exchange_code(cls, code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        """
        Exchange authorization code for tokens.
        Returns token info dict.
        """
        import requests
        
        token_uri = "https://oauth2.googleapis.com/token"
        
        data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri or settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code"
        }
        
        try:
            response = requests.post(token_uri, data=data)
            response.raise_for_status()
            token_data = response.json()
            
            access_token = token_data["access_token"]
            refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in", 3600)
            scope = token_data.get("scope", "")
            
            # Calculate expiry time
            token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
            
            # Get user info from access token
            userinfo = cls._get_user_info(access_token)
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_expiry": token_expiry,
                "scope": scope,
                "userinfo": userinfo
            }
            
        except requests.exceptions.HTTPError as e:
            logger.error(f"Failed to exchange OAuth code: {e.response.text}")
            raise Exception(f"Token exchange failed: {e.response.text}")
        except Exception as e:
            logger.error(f"Failed to exchange OAuth code: {e}")
            raise
    
    @classmethod
    def _get_user_info(cls, access_token: str) -> Dict[str, Any]:
        """Get user info from Google using access token."""
        response = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        response.raise_for_status()
        return response.json()
    
    @classmethod
    def refresh_access_token(cls, refresh_token: str) -> Optional[Dict[str, Any]]:
        """
        Refresh access token using refresh token.
        Returns new token info or None if refresh fails.
        """
        try:
            credentials = Credentials(
                token=None,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET,
                scopes=cls.SCOPES
            )
            
            credentials.refresh(Request())
            
            return {
                "access_token": credentials.token,
                "token_expiry": credentials.expiry,
                "scope": credentials.scopes
            }
            
        except Exception as e:
            logger.error(f"Failed to refresh token: {e}")
            return None
    
    @classmethod
    def revoke_token(cls, token: str) -> bool:
        """Revoke a token. Returns True if successful."""
        try:
            response = requests.post(
                "https://oauth2.googleapis.com/revoke",
                params={"token": token},
                headers={"content-type": "application/x-www-form-urlencoded"}
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to revoke token: {e}")
            return False


google_oauth_service = GoogleOAuthService()
