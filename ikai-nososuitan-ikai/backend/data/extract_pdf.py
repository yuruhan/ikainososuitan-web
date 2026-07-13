"""Extract text from the novel PDF, detect chapters and clean paragraphs."""
import re
import json
from pathlib import Path
from pypdf import PdfReader

PDF_PATH = Path(__file__).parent / "novela.pdf"
OUT_PATH = Path(__file__).parent / "novela_chapters.json"

reader = PdfReader(str(PDF_PATH))
print(f"Total pages: {len(reader.pages)}")

full_text_pages = []
for i, page in enumerate(reader.pages):
    try:
        t = page.extract_text() or ""
    except Exception:
        t = ""
    full_text_pages.append(t)

full_text = "\n".join(full_text_pages)
full_text = re.sub(r"\r\n?", "\n", full_text)

# Chapter heading pattern
chapter_pattern = re.compile(
    r"(?im)^[\t ]*(cap[ií]tulo\s+[0-9IVXLCDM]+)([\s:.\-—–]+)([^\n]{0,120})?$"
)

raw_matches = list(chapter_pattern.finditer(full_text))
print(f"Chapter matches (raw): {len(raw_matches)}")


def norm_num(s: str) -> str:
    return re.sub(r"\s+", "", s.lower())


# Group by unique chapter number, first occurrence wins
grouped = []
seen_numbers = []
for m in raw_matches:
    n = norm_num(m.group(1))
    if n not in seen_numbers:
        seen_numbers.append(n)
        grouped.append(m)

print(f"Chapter matches (deduped): {len(grouped)}")


def clean_spaces(text: str) -> str:
    # PDF often has double-space between words; normalize
    text = re.sub(r"[ \t]{2,}", " ", text)
    # Trim trailing spaces on each line
    text = re.sub(r"[ \t]+\n", "\n", text)
    return text


def strip_repeated_headers(body: str, chapter_num_raw: str, subtitle_raw: str) -> str:
    """Remove all occurrences of 'Capítulo N — subtitle' page-headers inside body."""
    # Normalize possible spacings inside header
    variants = set()
    if chapter_num_raw:
        variants.add(chapter_num_raw.strip())
        variants.add(re.sub(r"\s+", " ", chapter_num_raw.strip()))
    if subtitle_raw:
        variants.add(subtitle_raw.strip())
        variants.add(re.sub(r"\s+", " ", subtitle_raw.strip()))
    combined = None
    if chapter_num_raw and subtitle_raw:
        n1 = re.sub(r"\s+", " ", chapter_num_raw.strip())
        n2 = re.sub(r"\s+", " ", subtitle_raw.strip())
        combined = n1 + " — " + n2
        variants.add(combined)
    # For every variant, strip lines that match exactly
    lines = body.split("\n")
    cleaned = []
    for ln in lines:
        stripped = ln.strip()
        norm = re.sub(r"\s+", " ", stripped)
        if not norm:
            cleaned.append("")
            continue
        # Skip if the line is a chapter-number header (possibly with dash+subtitle)
        if re.match(r"(?i)^cap[ií]tulo\s+[0-9ivxlcdm]+([\s:.\-—–]+.*)?$", norm):
            continue
        # Skip standalone subtitle repetition
        if subtitle_raw and norm.lower() == re.sub(r"\s+", " ", subtitle_raw.strip()).lower():
            continue
        # Skip page numbers only
        if re.match(r"^\d{1,4}$", norm):
            continue
        cleaned.append(ln)
    return "\n".join(cleaned)


chapters = []
for idx, m in enumerate(grouped):
    start = m.start()
    end = grouped[idx + 1].start() if idx + 1 < len(grouped) else len(full_text)
    header = m.group(1).strip()
    subtitle = (m.group(3) or "").strip()

    body_full = full_text[start:end]
    # Remove the first heading line
    body_lines = body_full.split("\n", 1)
    body = body_lines[1] if len(body_lines) > 1 else ""

    body = strip_repeated_headers(body, header, subtitle)
    body = clean_spaces(body)

    # Each non-empty line = one paragraph (light novel style)
    paragraphs = [ln.strip() for ln in body.split("\n") if ln.strip()]

    header_clean = re.sub(r"\s+", " ", header).strip()
    subtitle_clean = re.sub(r"\s+", " ", subtitle).strip()

    chapters.append({
        "index": idx + 1,
        "number": header_clean,
        "subtitle": subtitle_clean,
        "title": f"{header_clean} — {subtitle_clean}" if subtitle_clean else header_clean,
        "paragraphs": paragraphs,
        "word_count": sum(len(p.split()) for p in paragraphs),
    })

data = {
    "title": "IKAI NO SŌSUITAN",
    "subtitle": "Crónicas de las Aguas Azules del Otro Mundo",
    "volume": "Volumen I",
    "genre": "Fantasía / Isekai",
    "language": "es",
    "total_chapters": len(chapters),
    "total_words": sum(c["word_count"] for c in chapters),
    "chapters": chapters,
}

with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Chapters detected: {len(chapters)}")
print(f"Total words: {data['total_words']}")
for c in chapters:
    print(f" - {c['title']} ({c['word_count']} words, {len(c['paragraphs'])} lines)")
