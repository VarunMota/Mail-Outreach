from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from app.main import app
from app.models.campaign_contact import CampaignContact
from app.models.email_event import EmailEvent

client = TestClient(app)

def test_track_open_success():
    with patch("app.api.v1.endpoints.tracking.get_db") as mock_get_db:
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Mock dependency override
        app.dependency_overrides = {} # Reset
        # We need to rely on the fact that get_db is called.
        # But FastAPI depends implementation is tricky to mock globally without overrides.
        # Let's use dependency_overrides for the actual test.
        
        from app.db import get_db
        app.dependency_overrides[get_db] = lambda: mock_db

        # Setup mock data
        campaign_contact = MagicMock(spec=CampaignContact, id=1, opened_at=None)
        mock_db.query.return_value.get.return_value = campaign_contact

        response = client.get("/api/v1/track/open/1")

        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"
        
        # Verify DB updates
        assert mock_db.add.called # Event added
        assert campaign_contact.opened_at is not None # Status updated
        mock_db.commit.assert_called()

def test_track_open_not_found():
    with patch("app.api.v1.endpoints.tracking.get_db") as mock_get_db:
        mock_db = MagicMock()
        from app.db import get_db
        app.dependency_overrides[get_db] = lambda: mock_db
        
        mock_db.query.return_value.get.return_value = None

        response = client.get("/api/v1/track/open/999")

        assert response.status_code == 200 # Should still return 200 image
        assert response.headers["content-type"] == "image/png"
        
        # Verify NO DB updates
        assert not mock_db.add.called
        assert not mock_db.commit.called

def test_track_click_success():
    with patch("app.api.v1.endpoints.tracking.get_db") as mock_get_db:
        mock_db = MagicMock()
        from app.db import get_db
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Setup mock data
        campaign_contact = MagicMock(spec=CampaignContact, id=1, clicked_at=None)
        mock_db.query.return_value.get.return_value = campaign_contact

        target_url = "https://example.com"
        response = client.get(f"/api/v1/track/click/1?url={target_url}", allow_redirects=False)

        assert response.status_code == 307
        assert response.headers["Location"] == target_url
        
        # Verify DB updates
        assert mock_db.add.called # Event added
        assert campaign_contact.clicked_at is not None # Status updated
        mock_db.commit.assert_called()

def test_track_click_not_found():
    with patch("app.api.v1.endpoints.tracking.get_db") as mock_get_db:
        mock_db = MagicMock()
        from app.db import get_db
        app.dependency_overrides[get_db] = lambda: mock_db
        
        mock_db.query.return_value.get.return_value = None

        target_url = "https://example.com"
        response = client.get(f"/api/v1/track/click/999?url={target_url}", allow_redirects=False)

        assert response.status_code == 307 # Should still redirect
        assert response.headers["Location"] == target_url
        
        # Verify NO DB updates
        assert not mock_db.add.called

