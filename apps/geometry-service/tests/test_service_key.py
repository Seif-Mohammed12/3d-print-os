import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "service_api_key", "s3cret-key")
    return TestClient(app)


def test_root_is_public(client):
    assert client.get("/").status_code == 200


def test_protected_route_requires_key(client):
    response = client.post("/api/v1/slice/upload")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_wrong_key_is_rejected(client):
    response = client.post("/api/v1/slice/upload", headers={"X-Service-Key": "nope"})
    assert response.status_code == 401


def test_correct_key_reaches_the_route(client):
    # No file attached, so the route itself rejects the request (422) after auth passes.
    response = client.post("/api/v1/slice/upload", headers={"X-Service-Key": "s3cret-key"})
    assert response.status_code == 422


def test_docs_are_hidden_behind_the_key(client):
    assert client.get("/openapi.json").status_code == 401


def test_no_key_configured_leaves_service_open(monkeypatch):
    monkeypatch.setattr(settings, "service_api_key", "")
    assert TestClient(app).post("/api/v1/slice/upload").status_code == 422
