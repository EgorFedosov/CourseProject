from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint_contract() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200

    payload = response.json()
    assert payload["api_status"] == "up"
    assert "neo4j_status" in payload
    assert "ai_status" in payload
