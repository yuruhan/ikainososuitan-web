# PRD — IKAI NO SŌSUITAN (Lector de Novela Ligera)

## Problem Statement (original)
> "hola tengo un borrador de 662 paginas pdf que quiero convertir ya en un libro casi echo de una novela ligera estilo anime"

## User Choices
- Aplicación web para leer la novela como light novel.
- Ilustraciones anime con IA — Gemini Nano Banana `gemini-3.1-flash-image-preview`.
- Sin sistema de login.
- Estilo visual "gustoso a los usuarios y muy intuitivo".

## Arquitectura
- Frontend: React 19 (CRA + Craco), Tailwind, Framer Motion, lucide-react, react-router. Sin login. Sin imports `@/`.
- Backend: FastAPI + Motor (MongoDB) + emergentintegrations (Gemini Nano Banana) + pypdf.
- Datos de la novela: extraídos del PDF (11.5 MB) a `backend/data/novela_chapters.json` — **24 capítulos, 112.150 palabras**.
- Ilustraciones IA: cacheadas en MongoDB (colección `illustrations`).
- Ilustraciones inline (manuales): archivos en `/app/frontend/public/illustrations/` referenciados desde `/app/frontend/src/data/illustrations.js`.
- PDF Volumen I: `/app/frontend/public/historia-vol1.pdf` (11.5 MB, se sirve desde `/historia-vol1.pdf`).

## Core Requirements
- Portada dramática (title, sinopsis, personajes, ToC) con botón de descarga de PDF.
- Reader tipográfico premium (Spectral / Crimson Text / Outfit) con modo claro/oscuro.
- Ajuste de fuente, barra de progreso, drawer con TOC + botón PDF + personajes + ajustes.
- Ilustración IA por capítulo con opción de regenerar (cacheada).
- **Carga bajo demanda**: sólo el capítulo activo se descarga. Metadata y lista de capítulos se cachean en memoria (novelCache) para no refetch al abrir el drawer o navegar.
- Todas las imágenes con `loading="lazy"` excepto el hero cover.
- CSS `content-visibility: auto` en párrafos → scroll fluido en capítulos largos (Ch17 con 2306 párrafos).

## Endpoints
- `GET /api/novel` metadata (title, subtitle, volume, genre, characters, synopsis).
- `GET /api/novel/chapters` lista de los 24 capítulos.
- `GET /api/novel/chapters/{index}` contenido completo del capítulo.
- `POST /api/novel/illustration` genera imagen con Gemini Nano Banana.
- `GET /api/novel/illustration/{index}` sirve la imagen cacheada.
- `DELETE /api/novel/illustration/{index}` limpia caché.

## What's Been Implemented
- **2026-01-11**: MVP con 17 capítulos, portada + reader + ilustraciones IA cacheadas. 100% tests.
- **2026-01-13** (iteración 2):
  - Volumen I completo (24 capítulos / 112.150 palabras).
  - Cache in-memory + AbortController + content-visibility para scroll fluido.
  - Botón Descargar PDF en portada y drawer.
  - Sistema de ilustraciones inline configurables + `loading="lazy"`.
  - Imports relativos, `craco build` intacto.
- **2026-01-13** (iteración 3):
  - Lore expandido extraído automáticamente con **Gemini 2.5 Pro** vía `extract_lore.py`:
    - **27 personajes** (protagonistas + secundarios + menores)
    - **29 bestias** (criaturas del bosque, aves espirituales, seres mágicos)
    - **15 lugares** (Aetherion, Aokawa, Lago Azul del Silencio, Bosque de las Mareas, Torre del Horizonte…)
  - Nuevas pestañas **Bestias** y **Lugares** en la portada (5 tabs totales).
  - Nuevas tabs equivalentes en el **drawer** del Reader (5 tabs).
  - Componentes reutilizables `LoreSection` + `DrawerLoreList`.
  - Fallback de personajes si `lore.json` no existe.

## Prioritized Backlog
- **P1**: Subir un PDF nuevo desde la UI (reemplazar dataset actual).
- **P1**: Guardar progreso por capítulo (localStorage o backend).
- **P2**: LLM que elija automáticamente la escena más visual del capítulo antes de ilustrarla.
- **P2**: Exportar EPUB con ilustraciones incrustadas (Kindle/Kobo).
- **P2**: Chat con OpenAI GPT sobre la novela (personajes, mundo Aetherion) — el usuario ya pidió, pendiente definir uso concreto.
- **P3**: Selector de estilo de ilustración (Shinkai / Ghibli / Ufotable / retrato / paisaje).
- **P3**: Página pública "compartir capítulo" con OG image dinámica.

## Test Credentials
No aplica (sin sistema de login).
