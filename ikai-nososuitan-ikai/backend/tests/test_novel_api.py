"""Backend API tests for IKAI NO SŌSUITAN - iteration 2 (24 chapters, 112150 words)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://anime-book-draft.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Novel metadata ---
def test_novel_meta(client):
    r = client.get(f"{API}/novel", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["total_chapters"] == 24
    assert data["total_words"] == 112150
    assert data["title"]
    assert isinstance(data["characters"], list) and len(data["characters"]) == 27
    assert isinstance(data["beasts"], list) and len(data["beasts"]) == 29
    assert isinstance(data["locations"], list) and len(data["locations"]) == 15
    char_names = {c["name"] for c in data["characters"]}
    for expected in ["Dyan", "Rias", "Kaede", "Hayato", "Aiko"]:
        assert expected in char_names, f"Missing character {expected}"
    beast_names = {b["name"] for b in data["beasts"]}
    assert "Ciervos de cristal" in beast_names
    assert "Zorro blanco" in beast_names
    loc_names = {l["name"] for l in data["locations"]}
    for expected in ["Aetherion", "Aokawa", "Lago Azul del Silencio"]:
        assert expected in loc_names, f"Missing location {expected}"
    # each item has required fields
    for c in data["characters"]:
        assert "name" in c and "description" in c and "color" in c and "role" in c
    for b in data["beasts"]:
        assert "name" in b and "description" in b and "color" in b and "type" in b
    for l in data["locations"]:
        assert "name" in l and "description" in l and "color" in l and "type" in l


# --- Chapters list ---
def test_chapters_list(client):
    r = client.get(f"{API}/novel/chapters", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 24
    last = data[-1]
    assert last["index"] == 24
    # verify final chapter subtitle
    combined = f"{last['number']} {last['subtitle']} {last['title']}"
    assert "primer paso" in combined.lower()


# --- Chapter 24 (last) ---
def test_chapter_24(client):
    r = client.get(f"{API}/novel/chapters/24", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["index"] == 24
    assert isinstance(data["paragraphs"], list) and len(data["paragraphs"]) > 0
    assert data["word_count"] > 0
    assert "primer paso" in (data["subtitle"] + " " + data["title"]).lower()


# --- Chapter 25 -> 404 ---
def test_chapter_25_not_found(client):
    r = client.get(f"{API}/novel/chapters/25", timeout=30)
    assert r.status_code == 404


# --- Chapter 17 updated (~11217 words, title "El camino de las mil huellas") ---
def test_chapter_17(client):
    r = client.get(f"{API}/novel/chapters/17", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["index"] == 17
    combined = (data["subtitle"] + " " + data["title"]).lower()
    assert "mil huellas" in combined
    # accept ~11217 with tolerance
    assert 10500 <= data["word_count"] <= 12000, f"Unexpected word_count: {data['word_count']}"


# --- Static PDF accessible ---
def test_pdf_accessible():
    r = requests.get(f"{BASE_URL}/historia-vol1.pdf", timeout=60, stream=True)
    assert r.status_code == 200
    ctype = r.headers.get("content-type", "").lower()
    assert "pdf" in ctype, f"Unexpected content-type: {ctype}"
