from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from app.main import app
from app.models.campaign import Campaign
from app.models.campaign_contact import CampaignContact
from collections import namedtuple

client = TestClient(app)

# Helper to mock named tuple result from SQLAlchemy
StatsResult = namedtuple('StatsResult', ['total', 'sent', 'opened', 'clicked', 'replied', 'bounced'])

def test_get_campaign_stats_success():
    with patch("app.api.v1.endpoints.campaigns.get_db") as mock_get_db:
        mock_db = MagicMock()
        from app.db import get_db
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock Campaign
        campaign = MagicMock(spec=Campaign, id=1)
        mock_db.query.return_value.get.return_value = campaign
        
        # Mock Aggregated Stats
        # total=100, sent=80 (status), opened=40, clicked=10, replied=5, bounced=5
        mock_stats = StatsResult(total=100, sent=80, opened=40, clicked=10, replied=5, bounced=5)
        
        # We need to mock the query chain: db.query(..).filter(..).first()
        # The first query is for aggregation
        mock_db.query.return_value.filter.return_value.first.return_value = mock_stats
        
        # The second query is for 'real_sent_count'
        mock_db.query.return_value.filter.return_value.count.return_value = 80

        response = client.get("/api/v1/campaigns/1/stats")

        assert response.status_code == 200
        data = response.json()
        
        assert data["total_contacts"] == 100
        assert data["sent"] == 80
        assert data["opened"] == 40
        assert data["clicked"] == 10
        assert data["replied"] == 5
        assert data["bounced"] == 5
        
        # Rates
        # Open: 40/80 = 50%
        assert data["open_rate"] == 50.0
        # Click: 10/80 = 12.5%
        assert data["click_rate"] == 12.5
        # Reply: 5/80 = 6.25%
        assert data["reply_rate"] == 6.25

def test_get_campaign_stats_not_found():
    with patch("app.api.v1.endpoints.campaigns.get_db") as mock_get_db:
        mock_db = MagicMock()
        from app.db import get_db
        app.dependency_overrides[get_db] = lambda: mock_db
        
        mock_db.query.return_value.get.return_value = None
        
        response = client.get("/api/v1/campaigns/999/stats")
        
        assert response.status_code == 404
