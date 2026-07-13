import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Menu, Sun, Moon, ChevronLeft, ChevronRight,
  Sparkles, Type, X, ScrollText, Users, Compass, Waves, Loader2,
  Image as ImageIcon, FileDown, Cat, MapPin
} from "lucide-react";
import "./App.css";
import { getChapterIllustrations } from "./data/illustrations";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// -------- In-memory cache (fetch only once per session) --------
const novelCache = {
  meta: null,
  chapters: null,
  metaPromise: null,
  chaptersPromise: null,
};

const fetchNovelMeta = () => {
  if (novelCache.meta) return Promise.resolve(novelCache.meta);
  if (novelCache.metaPromise) return novelCache.metaPromise;
  novelCache.metaPromise = axios.get(`${API}/novel`).then((r) => {
    novelCache.meta = r.data;
    novelCache.metaPromise = null;
    return r.data;
  });
  return novelCache.metaPromise;
};

const fetchChaptersList = () => {
  if (novelCache.chapters) return Promise.resolve(novelCache.chapters);
  if (novelCache.chaptersPromise) return novelCache.chaptersPromise;
  novelCache.chaptersPromise = axios.get(`${API}/novel/chapters`).then((r) => {
    novelCache.chapters = r.data;
    novelCache.chaptersPromise = null;
    return r.data;
  });
  return novelCache.chaptersPromise;
};

// -------- Theme hook --------
const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    const s = localStorage.getItem("ikai-theme");
    return s || "dark";
  });
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("ikai-theme", theme);
  }, [theme]);
  return { theme, toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
};

// -------- Reader settings --------
const useReaderSettings = () => {
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem("ikai-fs")) || 19);
  useEffect(() => {
    localStorage.setItem("ikai-fs", String(fontSize));
  }, [fontSize]);
  return { fontSize, setFontSize };
};

// ============ Layout: Top nav ============
const TopNav = ({ theme, toggleTheme, onMenu, showMenu = true, extra = null }) => (
  <header className="fixed top-0 left-0 right-0 z-40 glass px-5 md:px-8 py-4 flex items-center justify-between">
    <Link to="/" className="flex items-center gap-2.5 group" data-testid="nav-home-link">
      <Waves className="w-5 h-5 text-primary group-hover:rotate-6 transition-transform" />
      <span className="font-display text-lg tracking-tight">IKAI NO SŌSUITAN</span>
    </Link>
    <div className="flex items-center gap-2">
      {extra}
      <button
        onClick={toggleTheme}
        aria-label="Cambiar tema"
        className="p-2 rounded-full hover:bg-secondary transition-colors"
        data-testid="theme-toggle"
      >
        {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
      </button>
      {showMenu && (
        <button
          onClick={onMenu}
          aria-label="Menú"
          className="p-2 rounded-full hover:bg-secondary transition-colors"
          data-testid="menu-toggle"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
    </div>
  </header>
);

// ============ LoreSection: shared grid for characters / beasts / locations ============
const LoreSection = ({ items, subtitleKey, testId, emptyText }) => {
  if (!items || items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16 text-muted-foreground font-ui"
        data-testid={testId}
      >
        {emptyText}
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="grid md:grid-cols-2 gap-6"
      data-testid={testId}
    >
      {items.map((c, i) => (
        <motion.div
          key={c.name + i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.03, 0.4) }}
          className="glass rounded-2xl p-6 flex gap-5 items-start"
        >
          <div
            className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center font-display text-2xl font-semibold"
            style={{ background: `${c.color}22`, color: c.color, border: `1px solid ${c.color}44` }}
          >
            {c.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-display text-xl">{c.name}</div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-ui mt-0.5">
              {c[subtitleKey]}
            </div>
            <p className="mt-3 font-reader text-foreground/85 leading-relaxed">{c.description}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

// ============ Home / Book Cover ============
const Home = () => {
  const { theme, toggleTheme } = useTheme();
  const [novel, setNovel] = useState(novelCache.meta);
  const [chapters, setChapters] = useState(novelCache.chapters || []);
  const [tab, setTab] = useState("synopsis");
  const navigate = useNavigate();

  useEffect(() => {
    fetchNovelMeta().then(setNovel).catch(console.error);
    fetchChaptersList().then(setChapters).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen relative">
      <TopNav theme={theme} toggleTheme={toggleTheme} showMenu={false} />

      {/* HERO */}
      <section className="relative min-h-screen w-full flex items-end overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1489321336462-efe12c02d099?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwxfHxmYW50YXN5JTIwaWxsdXN0cmF0aW9uJTIwb2NlYW58ZW58MHx8fHwxNzgzNzk0MjM3fDA&ixlib=rb-4.1.0&q=85"
          alt=""
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 book-cover-gradient" />
        <div className="absolute top-24 right-6 md:right-14 hidden md:block">
          <div className="text-white/70 text-xs uppercase tracking-[0.3em] font-ui text-right">
            <div>異界の蒼水譚</div>
            <div className="mt-1 text-white/40">Volumen I</div>
          </div>
        </div>

        <div className="relative z-10 w-full px-6 md:px-16 pb-24 md:pb-32 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl"
          >
            <div className="text-primary/90 font-ui text-xs md:text-sm tracking-[0.3em] uppercase mb-4">
              {novel?.genre || "Fantasía · Isekai"}
            </div>
            <h1 className="font-display font-semibold text-white text-[42px] md:text-[92px] leading-[0.95] tracking-tight">
              IKAI NO
              <br />
              <span className="text-ocean italic">SŌSUITAN</span>
            </h1>
            <p className="mt-6 md:mt-8 text-white/80 font-reader text-lg md:text-2xl italic max-w-2xl leading-snug">
              {novel?.subtitle || "Crónicas de las Aguas Azules del Otro Mundo"}
            </p>
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => navigate("/read/1")}
                className="px-6 md:px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-ui font-medium tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center gap-2 shadow-2xl shadow-primary/30"
                data-testid="start-reading-btn"
              >
                <BookOpen className="w-4 h-4" />
                Comenzar a leer
              </button>
              <a
                href="#book-details"
                className="px-6 py-3.5 rounded-full glass text-white font-ui font-medium tracking-wide hover:bg-white/10 transition-colors flex items-center gap-2"
                data-testid="explore-btn"
              >
                Explorar la obra
              </a>
              <a
                href="/historia-vol1.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 rounded-full glass text-white font-ui font-medium tracking-wide hover:bg-white/10 transition-colors flex items-center gap-2"
                data-testid="download-pdf-btn"
              >
                <FileDown className="w-4 h-4" />
                Descargar PDF
              </a>
            </div>
            {novel && (
              <div className="mt-10 flex items-center gap-6 text-white/60 text-sm font-ui">
                <div>
                  <span className="text-white/90 font-medium">{novel.total_chapters}</span> capítulos
                </div>
                <div className="w-1 h-1 rounded-full bg-white/30" />
                <div>
                  <span className="text-white/90 font-medium">{novel.total_words.toLocaleString()}</span> palabras
                </div>
                <div className="w-1 h-1 rounded-full bg-white/30" />
                <div>{novel.volume}</div>
              </div>
            )}
          </motion.div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-xs uppercase tracking-[0.3em] font-ui animate-pulse">
          desliza para descubrir
        </div>
      </section>

      {/* BOOK DETAILS */}
      <section id="book-details" className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="flex items-center gap-1 mb-10 border-b border-border/60">
          {[
            { id: "synopsis", label: "Sinopsis", icon: ScrollText },
            { id: "characters", label: "Personajes", icon: Users },
            { id: "beasts", label: "Bestias", icon: Cat },
            { id: "locations", label: "Lugares", icon: MapPin },
            { id: "chapters", label: "Capítulos", icon: Compass },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                data-testid={`tab-${t.id}`}
                className={`px-4 md:px-6 py-3 text-sm font-ui tracking-wide flex items-center gap-2 border-b-2 -mb-px transition-colors ${
                  tab === t.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {tab === "synopsis" && (
            <motion.div
              key="synopsis"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="grid md:grid-cols-3 gap-10"
            >
              <div className="md:col-span-2">
                <div className="text-primary/80 font-ui text-xs uppercase tracking-[0.3em] mb-4">Sinopsis</div>
                <p className="font-reader text-xl md:text-2xl leading-relaxed text-foreground/90" data-testid="synopsis-text">
                  {novel?.synopsis}
                </p>
                <div className="mt-8 flex flex-wrap gap-2 font-ui text-xs">
                  {["Isekai", "Contemplativo", "Aetherion", "Comunidad", "Naturaleza", "Memoria"].map((t) => (
                    <span key={t} className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="md:col-span-1">
                <div className="glass rounded-2xl p-6 space-y-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-ui">Título</div>
                    <div className="font-display text-xl mt-1">IKAI NO SŌSUITAN</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-ui">Idioma</div>
                    <div className="font-ui">Español</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-ui">Género</div>
                    <div className="font-ui">{novel?.genre || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-ui">Volumen</div>
                    <div className="font-ui">{novel?.volume || "—"}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {tab === "characters" && (
            <LoreSection
              key="characters"
              items={novel?.characters || []}
              subtitleKey="role"
              testId="characters-grid"
              emptyText="Aún no hay personajes disponibles."
            />
          )}

          {tab === "beasts" && (
            <LoreSection
              key="beasts"
              items={novel?.beasts || []}
              subtitleKey="type"
              testId="beasts-grid"
              emptyText="Aún no hay bestias documentadas."
            />
          )}

          {tab === "locations" && (
            <LoreSection
              key="locations"
              items={novel?.locations || []}
              subtitleKey="type"
              testId="locations-grid"
              emptyText="Aún no hay lugares documentados."
            />
          )}

          {tab === "chapters" && (
            <motion.div
              key="chapters"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="grid md:grid-cols-2 gap-3"
              data-testid="chapters-list"
            >
              {chapters.map((ch) => (
                <Link
                  key={ch.index}
                  to={`/read/${ch.index}`}
                  data-testid={`chapter-link-${ch.index}`}
                  className="group flex items-center gap-4 p-4 rounded-xl hover:bg-secondary/60 transition-colors border border-transparent hover:border-border"
                >
                  <div className="font-display text-2xl text-muted-foreground group-hover:text-primary transition-colors w-10 text-right tabular-nums">
                    {String(ch.index).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-ui text-xs uppercase tracking-[0.2em] text-muted-foreground">{ch.number}</div>
                    <div className="font-display text-base md:text-lg truncate">{ch.subtitle || "—"}</div>
                  </div>
                  <div className="text-xs text-muted-foreground font-ui tabular-nums">
                    {ch.word_count.toLocaleString()} p.
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <footer className="border-t border-border/60 py-8 text-center font-ui text-xs text-muted-foreground">
        <div>© {new Date().getFullYear()} IKAI NO SŌSUITAN · Novela ligera</div>
      </footer>
    </div>
  );
};

// ============ Chapter Body with inline illustrations ============
const ChapterBody = ({ paragraphs, illustrations, fontSize }) => {
  // Group paragraphs and insert images at configured positions.
  // Uses content-visibility CSS to lazy-render off-screen paragraphs for smooth scroll.
  const positions = new Map();
  (illustrations || []).forEach((il, idx) => {
    const key = Math.max(0, Math.min(paragraphs.length, il.after ?? 0));
    if (!positions.has(key)) positions.set(key, []);
    positions.get(key).push({ ...il, _idx: idx });
  });

  const items = [];
  // Illustrations placed before any paragraph (after: 0)
  if (positions.has(0)) {
    positions.get(0).forEach((il) => {
      items.push(
        <InlineIllustration key={`il-0-${il._idx}`} src={il.src} alt={il.alt || ""} />
      );
    });
  }
  paragraphs.forEach((p, i) => {
    items.push(
      <p key={`p-${i}`} className="paragraph-cv">
        {p}
      </p>
    );
    const nextKey = i + 1;
    if (positions.has(nextKey)) {
      positions.get(nextKey).forEach((il) => {
        items.push(
          <InlineIllustration key={`il-${nextKey}-${il._idx}`} src={il.src} alt={il.alt || ""} />
        );
      });
    }
  });

  return (
    <div
      className="reader-body font-reader text-foreground/90"
      style={{ fontSize: `${fontSize}px` }}
      data-testid="chapter-body"
    >
      {items}
    </div>
  );
};

const InlineIllustration = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <figure className="my-10 -mx-2 md:-mx-6" data-testid="inline-illustration">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="w-full h-auto rounded-2xl border border-border/60 shadow-lg"
      />
      {alt && (
        <figcaption className="mt-2 text-center text-xs font-ui text-muted-foreground italic">
          {alt}
        </figcaption>
      )}
    </figure>
  );
};

// ============ Drawer compact lore list ============
const DrawerLoreList = ({ items, subtitleKey, testId }) => {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground font-ui" data-testid={testId}>
        Sin datos.
      </div>
    );
  }
  return (
    <div className="space-y-4" data-testid={testId}>
      {items.map((c, i) => (
        <div key={c.name + i} className="flex gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-display text-lg flex-shrink-0"
            style={{ background: `${c.color}22`, color: c.color, border: `1px solid ${c.color}44` }}
          >
            {c.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-display text-base">{c.name}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-ui">
              {c[subtitleKey]}
            </div>
            <p className="mt-1 text-sm font-reader text-foreground/85 leading-relaxed">{c.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============ Reader ============
const Reader = () => {
  const { theme, toggleTheme } = useTheme();
  const { fontSize, setFontSize } = useReaderSettings();
  const { index } = useParams();
  const chapterIndex = Math.max(1, Number(index) || 1);
  const [chapter, setChapter] = useState(null);
  const [chapterLoading, setChapterLoading] = useState(true);
  const [chapters, setChapters] = useState(novelCache.chapters || []);
  const [novelMeta, setNovelMeta] = useState(novelCache.meta);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState("toc");
  const [progress, setProgress] = useState(0);
  const [illust, setIllust] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const abortRef = useRef(null);
  const navigate = useNavigate();

  // One-time fetch of meta + list (cached)
  useEffect(() => {
    fetchNovelMeta().then(setNovelMeta).catch(console.error);
    fetchChaptersList().then(setChapters).catch(console.error);
  }, []);

  // Fetch only the current chapter body on chapter change.
  // Aborts previous request if user changes chapter fast.
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setChapter(null);
    setChapterLoading(true);
    setIllust(null);
    setProgress(0);
    window.scrollTo({ top: 0, behavior: "instant" });

    axios
      .get(`${API}/novel/chapters/${chapterIndex}`, { signal: controller.signal })
      .then((r) => {
        setChapter(r.data);
        if (r.data.illustration_url) {
          setIllust(`${BACKEND_URL}${r.data.illustration_url}?t=${Date.now()}`);
        }
      })
      .catch((e) => {
        if (!axios.isCancel(e)) console.error(e);
      })
      .finally(() => {
        if (!controller.signal.aborted) setChapterLoading(false);
      });

    return () => controller.abort();
  }, [chapterIndex]);

  // Scroll progress
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      const p = total > 0 ? (h.scrollTop / total) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, p)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [chapter]);

  const generateIllustration = async () => {
    setGenLoading(true);
    try {
      const res = await axios.post(`${API}/novel/illustration`, { chapter_index: chapterIndex });
      const url = `data:image/png;base64,${res.data.image_base64}`;
      setIllust(url);
    } catch (e) {
      console.error(e);
      alert("No fue posible generar la ilustración. Intenta de nuevo.");
    } finally {
      setGenLoading(false);
    }
  };

  const goPrev = () => {
    if (chapterIndex > 1) navigate(`/read/${chapterIndex - 1}`);
  };
  const goNext = () => {
    if (novelMeta && chapterIndex < novelMeta.total_chapters) navigate(`/read/${chapterIndex + 1}`);
  };

  const inlineIllustrations = getChapterIllustrations(chapterIndex);

  return (
    <div className="min-h-screen relative">
      <TopNav
        theme={theme}
        toggleTheme={toggleTheme}
        onMenu={() => setDrawerOpen(true)}
        extra={
          <div className="hidden md:block text-xs font-ui text-muted-foreground mr-2 tabular-nums">
            {chapter ? `${chapter.number}` : "…"}
          </div>
        }
      />

      <div className="fixed top-[68px] left-0 right-0 h-[2px] bg-border/40 z-40">
        <div
          className="h-full bg-primary transition-[width] duration-150"
          style={{ width: `${progress}%` }}
          data-testid="progress-bar"
        />
      </div>

      <main className="pt-32 pb-40 px-5 md:px-8">
        {chapterLoading ? (
          <div className="max-w-3xl mx-auto text-center py-32 text-muted-foreground font-ui">
            <Loader2 className="w-6 h-6 mx-auto animate-spin" />
            <div className="mt-3">Cargando capítulo…</div>
          </div>
        ) : chapter ? (
          <article className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-16"
            >
              <div className="text-primary font-ui text-xs uppercase tracking-[0.35em] mb-4">
                {chapter.number}
              </div>
              <h1 className="font-display text-4xl md:text-6xl leading-[1.05] tracking-tight">
                {chapter.subtitle}
              </h1>
              <div className="mt-6 flex items-center gap-4 text-xs font-ui text-muted-foreground tabular-nums">
                <span>{chapter.word_count.toLocaleString()} palabras</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                <span>~{Math.max(1, Math.round(chapter.word_count / 220))} min lectura</span>
              </div>
            </motion.div>

            {/* AI illustration header */}
            <div className="mb-16">
              {illust ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="relative rounded-2xl overflow-hidden group"
                  data-testid="chapter-illustration"
                >
                  <img
                    src={illust}
                    alt={`Ilustración del ${chapter.number}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto"
                  />
                  <button
                    onClick={generateIllustration}
                    disabled={genLoading}
                    className="absolute bottom-3 right-3 glass px-3 py-1.5 rounded-full text-xs font-ui flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    data-testid="regenerate-illustration-btn"
                  >
                    {genLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Regenerar
                  </button>
                </motion.div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-8 md:p-10 text-center">
                  <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground/70" />
                  <div className="mt-4 font-display text-xl">Ilustración de capítulo</div>
                  <p className="mt-2 text-sm text-muted-foreground font-ui max-w-md mx-auto">
                    Genera una ilustración anime estilo light novel para este capítulo usando IA (Gemini Nano Banana).
                  </p>
                  <button
                    onClick={generateIllustration}
                    disabled={genLoading}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-ui text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-70"
                    data-testid="generate-illustration-btn"
                  >
                    {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {genLoading ? "Generando…" : "Generar ilustración"}
                  </button>
                </div>
              )}
            </div>

            {/* Body with inline illustrations */}
            <ChapterBody
              paragraphs={chapter.paragraphs}
              illustrations={inlineIllustrations}
              fontSize={fontSize}
            />

            {/* Chapter nav footer */}
            <div className="mt-24 grid grid-cols-2 gap-4">
              <button
                onClick={goPrev}
                disabled={chapterIndex <= 1}
                className="p-5 rounded-xl border border-border hover:bg-secondary/60 disabled:opacity-30 disabled:pointer-events-none text-left transition-colors"
                data-testid="prev-chapter-btn"
              >
                <div className="flex items-center gap-2 text-xs font-ui uppercase tracking-[0.2em] text-muted-foreground">
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </div>
                {chapterIndex > 1 && chapters[chapterIndex - 2] && (
                  <div className="mt-2 font-display truncate">{chapters[chapterIndex - 2].subtitle}</div>
                )}
              </button>
              <button
                onClick={goNext}
                disabled={!novelMeta || chapterIndex >= novelMeta.total_chapters}
                className="p-5 rounded-xl border border-border hover:bg-secondary/60 disabled:opacity-30 disabled:pointer-events-none text-right transition-colors"
                data-testid="next-chapter-btn"
              >
                <div className="flex items-center justify-end gap-2 text-xs font-ui uppercase tracking-[0.2em] text-muted-foreground">
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </div>
                {chapters[chapterIndex] && (
                  <div className="mt-2 font-display truncate">{chapters[chapterIndex].subtitle}</div>
                )}
              </button>
            </div>
          </article>
        ) : (
          <div className="max-w-3xl mx-auto text-center py-32 text-muted-foreground font-ui">
            No se pudo cargar el capítulo.
          </div>
        )}
      </main>

      {/* Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setDrawerOpen(false)}
              data-testid="drawer-backdrop"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md z-50 glass border-l border-border overflow-y-auto"
              data-testid="side-drawer"
            >
              <div className="p-6 flex items-center justify-between sticky top-0 glass border-b border-border/60">
                <div className="font-display text-lg">Navegación</div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-full hover:bg-secondary"
                  aria-label="Cerrar"
                  data-testid="drawer-close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 pt-4 flex items-center gap-1 border-b border-border/60 overflow-x-auto">
                {[
                  { id: "toc", label: "Capítulos", icon: ScrollText },
                  { id: "chars", label: "Personajes", icon: Users },
                  { id: "beasts", label: "Bestias", icon: Cat },
                  { id: "places", label: "Lugares", icon: MapPin },
                  { id: "settings", label: "Ajustes", icon: Type },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setDrawerTab(t.id)}
                      data-testid={`drawer-tab-${t.id}`}
                      className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-ui tracking-wide -mb-px border-b-2 transition-colors whitespace-nowrap ${
                        drawerTab === t.id
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="p-6">
                {drawerTab === "toc" && (
                  <div className="space-y-1" data-testid="drawer-toc">
                    <a
                      href="/historia-vol1.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-3 mb-4 rounded-lg border border-primary/40 hover:bg-primary/10 transition-colors bg-primary/5"
                      data-testid="drawer-pdf-btn"
                    >
                      <FileDown className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-ui text-sm font-medium">Descargar Volumen I (PDF)</div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Se abre en pestaña nueva</div>
                      </div>
                    </a>
                    {chapters.map((ch) => (
                      <Link
                        key={ch.index}
                        to={`/read/${ch.index}`}
                        onClick={() => setDrawerOpen(false)}
                        data-testid={`drawer-chapter-${ch.index}`}
                        className={`block px-3 py-2.5 rounded-lg hover:bg-secondary/70 transition-colors ${
                          ch.index === chapterIndex ? "bg-secondary" : ""
                        }`}
                      >
                        <div className="text-[10px] font-ui uppercase tracking-[0.25em] text-muted-foreground">{ch.number}</div>
                        <div className="font-display text-base leading-tight">{ch.subtitle}</div>
                      </Link>
                    ))}
                  </div>
                )}

                {drawerTab === "chars" && (
                  <DrawerLoreList items={novelMeta?.characters || []} subtitleKey="role" testId="drawer-chars" />
                )}

                {drawerTab === "beasts" && (
                  <DrawerLoreList items={novelMeta?.beasts || []} subtitleKey="type" testId="drawer-beasts" />
                )}

                {drawerTab === "places" && (
                  <DrawerLoreList items={novelMeta?.locations || []} subtitleKey="type" testId="drawer-places" />
                )}

                {drawerTab === "settings" && (
                  <div className="space-y-8" data-testid="drawer-settings">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-ui text-sm">Tamaño de fuente</div>
                        <div className="font-ui text-xs text-muted-foreground tabular-nums">{fontSize}px</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setFontSize((s) => Math.max(14, s - 1))}
                          className="w-9 h-9 rounded-lg border border-border hover:bg-secondary"
                          data-testid="font-decrease-btn"
                        >
                          A-
                        </button>
                        <input
                          type="range"
                          min={14}
                          max={26}
                          value={fontSize}
                          onChange={(e) => setFontSize(Number(e.target.value))}
                          className="flex-1 accent-primary"
                          data-testid="font-size-slider"
                        />
                        <button
                          onClick={() => setFontSize((s) => Math.min(26, s + 1))}
                          className="w-9 h-9 rounded-lg border border-border hover:bg-secondary"
                          data-testid="font-increase-btn"
                        >
                          A+
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="font-ui text-sm mb-3">Tema</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => theme !== "light" && toggleTheme()}
                          className={`p-3 rounded-lg border ${theme === "light" ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}
                          data-testid="theme-light-btn"
                        >
                          <Sun className="w-4 h-4 mx-auto mb-1" />
                          <div className="text-xs font-ui">Claro</div>
                        </button>
                        <button
                          onClick={() => theme !== "dark" && toggleTheme()}
                          className={`p-3 rounded-lg border ${theme === "dark" ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}
                          data-testid="theme-dark-btn"
                        >
                          <Moon className="w-4 h-4 mx-auto mb-1" />
                          <div className="text-xs font-ui">Oscuro</div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============ App root ============
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/read/:index" element={<Reader />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
