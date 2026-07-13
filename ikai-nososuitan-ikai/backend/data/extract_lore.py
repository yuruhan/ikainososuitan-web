"""Extrae personajes, bestias y lugares del texto de la novela usando LLM."""
import asyncio
import json
import os
import re
import sys
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / '.env')

sys.path.insert(0, str(ROOT))

from emergentintegrations.llm.chat import LlmChat, UserMessage

DATA = json.load(open(Path(__file__).parent / "novela_chapters.json", encoding="utf-8"))
OUT = Path(__file__).parent / "lore.json"

# Build a compacted version of the novel text (all paragraphs joined per chapter)
sections = []
for c in DATA["chapters"]:
    body = " ".join(c["paragraphs"])
    sections.append(f"### {c['title']}\n{body}")

full_text = "\n\n".join(sections)
print(f"Total chars: {len(full_text)}")

# Trim if too long — Gemini 1.5/2.x flash handles ~1M tokens but be safe
MAX = 500_000
if len(full_text) > MAX:
    print(f"Truncating from {len(full_text)} to {MAX}")
    full_text = full_text[:MAX]

PROMPT = f"""Eres un analista literario. Lee la siguiente novela ligera de fantasía isekai "IKAI NO SŌSUITAN — Crónicas de las Aguas Azules del Otro Mundo" y extrae exhaustivamente:

1. **characters**: TODOS los personajes con nombre propio que aparecen (protagonistas, secundarios y menores). Para cada uno un objeto con:
   - name (nombre exacto como aparece)
   - role (rol/profesión, ej: "Protagonista", "Sanadora del pueblo", "Herrero", "Comerciante", "Anciano mentor", "Niño del pueblo")
   - description (2-3 frases sobre personalidad y aporte a la trama, en español)
   - color (código hex adecuado a su esencia; agua = #33E1FF, bosque = #5FB86A, fuego = #FF8A65, tierra = #C69C6D, cielo = #94B8FF, luna = #B8A6D8, cerezo = #F7B5D4, oro = #E5B85A, hierro = #A0A8B0, etc)

2. **beasts**: TODAS las criaturas, bestias o animales fantásticos mencionados (criaturas del río, bosque, cielo, seres mágicos, monstruos, animales del pueblo). Para cada uno:
   - name
   - type (ej: "Criatura acuática", "Bestia del bosque", "Ave espiritual", "Animal de campo")
   - description (2-3 frases)
   - color (hex)

3. **locations**: TODOS los lugares nombrados (pueblos, bosques, ríos, montañas, casas importantes, templos, regiones). Para cada uno:
   - name
   - type (ej: "Pueblo", "Bosque", "Río", "Casa", "Camino")
   - description (2-3 frases)
   - color (hex)

REGLAS ESTRICTAS:
- Sé EXHAUSTIVO. Busca en toda la novela. Prefiere incluir de más que quedarte corto.
- Usa nombres exactos tal como aparecen en el texto (respeta acentos, mayúsculas).
- description en español, elegante pero conciso.
- Devuelve SOLO un objeto JSON con esas 3 keys (characters, beasts, locations), sin texto antes ni después, sin markdown, sin ```.

TEXTO DE LA NOVELA:
{full_text}
"""

async def main():
    key = os.environ["EMERGENT_LLM_KEY"]
    chat = LlmChat(
        api_key=key,
        session_id="ikai-lore-extract",
        system_message="Eres un analista literario meticuloso. Devuelves siempre JSON válido sin texto extra.",
    ).with_model("gemini", "gemini-2.5-pro").with_params(max_tokens=32000)

    print("Sending to Gemini…")
    resp = await chat.send_message(UserMessage(text=PROMPT))
    text = resp if isinstance(resp, str) else str(resp)
    print(f"Response chars: {len(text)}")

    # Strip possible ``` fences
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        data = json.loads(cleaned)
    except Exception as e:
        # Try to find the JSON block
        m = re.search(r"\{[\s\S]*\}", cleaned)
        if m:
            data = json.loads(m.group(0))
        else:
            print("=== RAW RESPONSE ===")
            print(text[:3000])
            raise

    # Basic normalization / stats
    for k in ("characters", "beasts", "locations"):
        data.setdefault(k, [])
        print(f"  {k}: {len(data[k])}")

    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved -> {OUT}")

if __name__ == "__main__":
    asyncio.run(main())
