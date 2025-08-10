import pytest
import respx
from httpx import AsyncClient, ASGITransport, Response
from main import app

def _client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")

@pytest.mark.anyio("asyncio")
async def test_root_ok():
    async with _client() as ac:
        r = await ac.get("/")
    assert r.status_code == 200
    assert "home free" in r.json().get("message", "").lower()

@respx.mock
@pytest.mark.anyio("asyncio")
async def test_accessibility_counts_ok():
    # Mock Overpass
    overpass = respx.post("https://overpass-api.de/api/interpreter").mock(
        return_value=Response(200, json={"elements": [{}, {}, {}]})
    )
    async with _client() as ac:
        r = await ac.get("/accessibility", params={"lat": -33.86, "lon": 151.21})
    assert r.status_code == 200
    assert overpass.called

@respx.mock
@pytest.mark.anyio("asyncio")
async def test_mobility_error_is_handled():
    # Mock a failing external dataset call
    respx.get(
        "https://data.melbourne.vic.gov.au/api/v2/catalog/datasets/public-toilets/exports/json"
    ).mock(return_value=Response(500, text="boom"))

    async with _client() as ac:
        r = await ac.get("/mobility")
    assert r.status_code == 200
    body = r.json()
    assert "error" in body or "message" in body