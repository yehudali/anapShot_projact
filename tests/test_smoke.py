"""
Smoke tests — run against a live Docker stack.
  docker compose up --build -d
  pytest tests/

If you bootstrapped with non-default credentials, pass them via env vars:
  TEST_ADMIN_USER=youradmin TEST_ADMIN_PASS=yourpass pytest tests/
"""
import os

import httpx

BASE = "http://localhost:8000"
ADMIN_USER = os.getenv("TEST_ADMIN_USER", "testadmin")
ADMIN_PASS = os.getenv("TEST_ADMIN_PASS", "test123")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _bootstrap_or_login() -> str:
    """Bootstrap first admin if DB is empty, then login and return token."""
    r = httpx.post(
        f"{BASE}/api/v1/auth/bootstrap",
        json={"username": ADMIN_USER, "password": ADMIN_PASS},
        timeout=10,
    )
    # 200 = bootstrapped now, 409 = already exists — both are fine
    assert r.status_code in (200, 409), f"Bootstrap failed: {r.text}"

    r = httpx.post(
        f"{BASE}/api/v1/auth/login",
        json={"username": ADMIN_USER, "password": ADMIN_PASS},
        timeout=10,
    )
    assert r.status_code == 200, (
        f"Login failed — if you used custom credentials, set "
        f"TEST_ADMIN_USER / TEST_ADMIN_PASS env vars. Response: {r.text}"
    )
    return r.json()["data"]["token"]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_health():
    r = httpx.get(f"{BASE}/health", timeout=10)
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_bootstrap_and_login():
    token = _bootstrap_or_login()
    assert isinstance(token, str) and len(token) > 10


def test_protected_route_without_token():
    r = httpx.get(f"{BASE}/api/v1/devices", timeout=10)
    assert r.status_code == 403


def test_device_crud():
    token = _bootstrap_or_login()
    h = {"Authorization": f"Bearer {token}"}

    # Create
    r = httpx.post(
        f"{BASE}/api/v1/devices",
        json={"name": "smoke-test-device"},
        headers=h,
        timeout=10,
    )
    assert r.status_code == 200, f"Create device failed: {r.text}"
    device_id = r.json()["data"]["id"]
    api_key = r.json()["data"]["api_key"]
    assert api_key, "api_key should be returned on create"

    # Get
    r = httpx.get(f"{BASE}/api/v1/devices/{device_id}", headers=h, timeout=10)
    assert r.status_code == 200

    # Report location (uses api_key, not Bearer)
    r = httpx.post(
        f"{BASE}/api/v1/devices/{device_id}/location",
        json={
            "device_id": device_id,
            "event_id": "test-event",
            "latitude": 31.5,
            "longitude": 34.8,
            "timestamp": "2026-01-01T00:00:00+00:00",
            "accuracy": 5.0,
        },
        headers={"X-Api-Key": api_key},
        timeout=10,
    )
    assert r.status_code == 200, f"Location report failed: {r.text}"

    # Delete
    r = httpx.delete(f"{BASE}/api/v1/devices/{device_id}", headers=h, timeout=10)
    assert r.status_code == 200


def test_event_create_and_close():
    token = _bootstrap_or_login()
    h = {"Authorization": f"Bearer {token}"}

    # Create event
    r = httpx.post(
        f"{BASE}/api/v1/events",
        json={"name": "smoke-test-event"},
        headers=h,
        timeout=10,
    )
    assert r.status_code == 200, f"Create event failed: {r.text}"
    event_id = r.json()["data"]["event_id"]

    # Get event
    r = httpx.get(f"{BASE}/api/v1/events/{event_id}", headers=h, timeout=10)
    assert r.status_code == 200
    assert r.json()["data"]["status"] == "active"

    # Close event
    r = httpx.put(f"{BASE}/api/v1/events/{event_id}/close", headers=h, timeout=10)
    assert r.status_code == 200

    # Verify closed
    r = httpx.get(f"{BASE}/api/v1/events/{event_id}", headers=h, timeout=10)
    assert r.json()["data"]["status"] == "closed"


def test_live_locations_endpoint():
    token = _bootstrap_or_login()
    h = {"Authorization": f"Bearer {token}"}

    # Create and immediately close an event (no devices, empty locations)
    r = httpx.post(f"{BASE}/api/v1/events", json={"name": "loc-test"}, headers=h, timeout=10)
    assert r.status_code == 200
    event_id = r.json()["data"]["event_id"]

    r = httpx.get(f"{BASE}/api/v1/events/{event_id}/locations", headers=h, timeout=10)
    assert r.status_code == 200
    assert "locations" in r.json()

    httpx.put(f"{BASE}/api/v1/events/{event_id}/close", headers=h, timeout=10)
