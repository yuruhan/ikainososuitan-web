from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import base64
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Load novel data once at startup
NOVEL_DATA_PATH = ROOT_DIR / 'data' / 'novela_chapters.json'
with open(NOVEL_DATA_PATH, 'r', encoding='utf-8') as f:
    NOVEL_DATA = json.load(f)

# Load extended lore (characters, beasts, locations) extracted from the novel by LLM
LORE_PATH = ROOT_DIR / 'data' / 'lore.json'
if LORE_PATH.exists():
    with open(LORE_PATH, 'r', encoding='utf-8') as f:
        LORE = json.load(f)
else:
    LORE = {"characters": [], "beasts": [], "locations": []}

CHARACTERS = LORE.get("characters", [])
BEASTS = LORE.get("beasts", [])
LOCATIONS = LORE.get("locations", [])

# Characters extracted from the novel analysis
CHARACTERS_FALLBACK = [
    {
        "name": "Dyan",
        "role": "Protagonista",
        "description": "Un joven que despierta en Aetherion sin recuerdos de su pasado. Observador y curioso, aprende poco a poco a comprender los matices de este nuevo mundo mientras redescubre quién es.",
        "color": "#33E1FF"
    },
    {
        "name": "Rias",
        "role": "Guía en Aokawa",
        "description": "Una joven del pueblo Aokawa que encuentra a Dyan y lo ayuda a adaptarse. Expresiva y sensible, mantiene una conexión profunda con la naturaleza.",
        "color": "#F7B5D4"
    },
    {
        "name": "Kaede",
        "role": "Sanadora",
        "description": "Sanadora del pueblo, cuidadosa y sabia. Ofrece a Dyan atención y las primeras orientaciones sobre este otro mundo.",
        "color": "#B7E1B0"
    },
    {
        "name": "Ren",
        "role": "Anciano mentor",
        "description": "Figura anciana y conocedora que actúa como mentor de Dyan, enseñándole el valor de la observación y del entendimiento.",
        "color": "#D8B4F8"
    },
    {
        "name": "Daigo",
        "role": "Herrero",
        "description": "Artesano fuerte y práctico. Enseña con acciones y con la calma del trabajo bien hecho.",
        "color": "#FFA574"
    },
    {
        "name": "Garen",
        "role": "Posadero viajero",
        "description": "Posadero y viajero experimentado que le ofrece a Dyan pertenencia y sabiduría sobre el camino.",
        "color": "#8FB6FF"
    },
]

if not CHARACTERS:
    CHARACTERS = CHARACTERS_FALLBACK

SYNOPSIS = (
    "Dyan despierta en Aetherion, un mundo desconocido y sereno, sin recuerdo alguno de su pasado. "
    "Guiado por los habitantes del pueblo Aokawa —Rias, la sanadora Kaede y el anciano Ren— comienza "
    "un lento descubrimiento del lugar al que ha llegado: sus costumbres, sus criaturas, y las aguas "
    "azules que parecen guardar memoria de todo. Entre lecciones silenciosas, encuentros con artesanos, "
    "cazadores y viajeros, Dyan aprende que el verdadero viaje no está en la meta sino en cada gesto y "
    "cada resonancia. Una novela de fantasía isekai contemplativa, donde la naturaleza recuerda y el "
    "tiempo camina despacio."
)

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ----------- Models -----------
class NovelMetadata(BaseModel):
    title: str
    subtitle: str
    volume: str
    genre: str
    total_chapters: int
    total_words: int
    synopsis: str
    characters: list
    beasts: list
    locations: list

class ChapterSummary(BaseModel):
    index: int
    number: str
    subtitle: str
    title: str
    word_count: int

class ChapterFull(BaseModel):
    index: int
    number: str
    subtitle: str
    title: str
    paragraphs: List[str]
    word_count: int
    illustration_url: Optional[str] = None

class IllustrationRequest(BaseModel):
    chapter_index: int
    scene_hint: Optional[str] = None  # optional user hint

class IllustrationResponse(BaseModel):
    chapter_index: int
    image_base64: str
    prompt: str
    cached: bool

# ----------- Routes -----------
@api_router.get("/")
async def root():
    return {"message": "IKAI NO SŌSUITAN API", "ok": True}

@api_router.get("/novel", response_model=NovelMetadata)
async def get_novel_meta():
    return NovelMetadata(
        title=NOVEL_DATA["title"],
        subtitle=NOVEL_DATA["subtitle"],
        volume=NOVEL_DATA["volume"],
        genre=NOVEL_DATA.get("genre", "Fantasía / Isekai"),
        total_chapters=NOVEL_DATA["total_chapters"],
        total_words=NOVEL_DATA["total_words"],
        synopsis=SYNOPSIS,
        characters=CHARACTERS,
        beasts=BEASTS,
        locations=LOCATIONS,
    )

@api_router.get("/novel/chapters", response_model=List[ChapterSummary])
async def list_chapters():
    out = []
    for c in NOVEL_DATA["chapters"]:
        out.append(ChapterSummary(
            index=c["index"],
            number=c["number"],
            subtitle=c["subtitle"],
            title=c["title"],
            word_count=c["word_count"],
        ))
    return out

@api_router.get("/novel/chapters/{index}", response_model=ChapterFull)
async def get_chapter(index: int):
    if index < 1 or index > len(NOVEL_DATA["chapters"]):
        raise HTTPException(status_code=404, detail="Chapter not found")
    c = NOVEL_DATA["chapters"][index - 1]
    doc = await db.illustrations.find_one({"chapter_index": index}, {"_id": 0})
    illustration_url = None
    if doc:
        illustration_url = f"/api/novel/illustration/{index}"
    return ChapterFull(
        index=c["index"],
        number=c["number"],
        subtitle=c["subtitle"],
        title=c["title"],
        paragraphs=c["paragraphs"],
        word_count=c["word_count"],
        illustration_url=illustration_url,
    )

def _build_illustration_prompt(chapter: dict, scene_hint: Optional[str] = None) -> str:
    subtitle = chapter.get("subtitle", "")
    # Grab a snippet from the middle of the chapter to represent a scene
    paras = chapter.get("paragraphs", [])
    snippet_lines = paras[10:30] if len(paras) > 30 else paras[:20]
    snippet = " ".join(snippet_lines)[:900]

    hint_line = f"Enfoque especial: {scene_hint}. " if scene_hint else ""
    return (
        "Ilustración estilo novela ligera japonesa (light novel / anime), altamente detallada, "
        "arte digital cinematográfico, colores suaves y atmósfera etérea con predominancia de tonos "
        "azul océano, aguamarina, cielo del amanecer y toques de verde bosque. "
        "Iluminación cálida y suave, composición con profundidad, cinemática al estilo Makoto Shinkai. "
        f"Escena para el capítulo titulado \"{chapter['title']}\". "
        f"Subtítulo del capítulo: {subtitle}. "
        f"{hint_line}"
        f"Contexto narrativo (novela IKAI NO SŌSUITAN, isekai contemplativo en el mundo de Aetherion): {snippet} "
        "Sin texto, sin letras, sin marca de agua. Formato horizontal 16:9 apto para cabecera de capítulo."
    )

@api_router.post("/novel/illustration", response_model=IllustrationResponse)
async def generate_illustration(req: IllustrationRequest):
    index = req.chapter_index
    if index < 1 or index > len(NOVEL_DATA["chapters"]):
        raise HTTPException(status_code=404, detail="Chapter not found")
    chapter = NOVEL_DATA["chapters"][index - 1]

    # Serve cached (only when no custom hint)
    if not req.scene_hint:
        cached = await db.illustrations.find_one({"chapter_index": index}, {"_id": 0})
        if cached and cached.get("image_base64"):
            return IllustrationResponse(
                chapter_index=index,
                image_base64=cached["image_base64"],
                prompt=cached.get("prompt", ""),
                cached=True,
            )

    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    prompt = _build_illustration_prompt(chapter, req.scene_hint)

    # Import inside handler so import errors don't break startup
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"emergentintegrations not available: {e}")

    session_id = f"ikai-chapter-{index}-{uuid.uuid4()}"
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message="Eres un ilustrador de novelas ligeras japonesas.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])

    msg = UserMessage(text=prompt)
    try:
        _text, images = await chat.send_message_multimodal_response(msg)
    except Exception as e:
        logger.exception("Illustration generation failed")
        raise HTTPException(status_code=502, detail=f"Image generation failed: {e}")

    if not images:
        raise HTTPException(status_code=502, detail="No images returned from model")

    img = images[0]
    image_b64 = img["data"]  # already base64 string

    # Store/replace in DB
    doc = {
        "chapter_index": index,
        "prompt": prompt,
        "mime_type": img.get("mime_type", "image/png"),
        "image_base64": image_b64,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.illustrations.update_one(
        {"chapter_index": index},
        {"$set": doc},
        upsert=True,
    )

    return IllustrationResponse(
        chapter_index=index,
        image_base64=image_b64,
        prompt=prompt,
        cached=False,
    )

@api_router.get("/novel/illustration/{chapter_index}")
async def get_illustration_image(chapter_index: int):
    doc = await db.illustrations.find_one({"chapter_index": chapter_index}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Illustration not found")
    raw = None
    try:
        raw = base64.b64decode(doc["image_base64"])
    except Exception:
        raise HTTPException(status_code=500, detail="Invalid stored image")
    return Response(content=raw, media_type=doc.get("mime_type", "image/png"))

@api_router.delete("/novel/illustration/{chapter_index}")
async def delete_illustration(chapter_index: int):
    result = await db.illustrations.delete_one({"chapter_index": chapter_index})
    return {"deleted": result.deleted_count}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
