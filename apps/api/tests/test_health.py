from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "asha-api"

def test_list_members():
    res = client.get("/api/v1/shgs/current/members")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["data"]) == 12

def test_list_orders():
    res = client.get("/api/v1/orders")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["data"]) >= 1

def test_production_plan():
    res = client.get("/api/v1/orders/ord-001/plan")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["data"]["stages"]) >= 3

def test_allocation_proposal():
    res = client.get("/api/v1/orders/ord-001/allocation/proposal")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["data"]["allocations"]) > 0

def test_member_tasks():
    res = client.get("/api/v1/member/tasks")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["data"]) >= 1

def test_quality_queue():
    res = client.get("/api/v1/quality/review-queue")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
