"""Tests for the health endpoint and basic API setup."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_returns_200():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "env" in data


def test_docs_available_in_dev():
    response = client.get("/docs")
    assert response.status_code == 200


def test_unknown_route_returns_404():
    response = client.get("/api/v1/does-not-exist")
    assert response.status_code == 404
