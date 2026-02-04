const express = require("express");
const path = require("path");
const fs = require("fs/promises");

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "events.json");

app.use(express.json());

// Статика: /dashboards.html, /analytics.html, /error.html, /css/*, /js/*
app.use(express.static(PUBLIC_DIR));

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function loadEvents() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveEvents(events) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(events, null, 2), "utf8");
}

function isoDate(d) {
  // YYYY-MM-DD
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Главная страница -> Дашборды
app.get("/", (req, res) => res.redirect("/dashboards.html"));

// API: записать событие (например, "открыли страницу")
app.post("/api/event", async (req, res) => {
  const { page, action } = req.body || {};
  const safePage = typeof page === "string" ? page.slice(0, 50) : "unknown";
  const safeAction = typeof action === "string" ? action.slice(0, 50) : "unknown";

  const events = await loadEvents();

  const event = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: new Date().toISOString(),
    page: safePage,
    action: safeAction,
    // Для учебной задачи - достаточно:
    ip: req.ip
  };

  events.push(event);

  // Ограничим историю, чтобы файл не рос бесконечно
  const MAX = 1000;
  const trimmed = events.length > MAX ? events.slice(events.length - MAX) : events;

  await saveEvents(trimmed);
  res.status(201).json(event);
});

// API: сводка для Дашбордов
app.get("/api/summary", async (req, res) => {
  const events = await loadEvents();

  const totalsByPage = {};
  for (const e of events) {
    totalsByPage[e.page] = (totalsByPage[e.page] || 0) + 1;
  }

  const lastEvents = events.slice(-5).reverse();

  res.json({
    totalEvents: events.length,
    totalsByPage,
    lastEvents
  });
});

// API: временной ряд для Аналитики (по дням)
app.get("/api/series", async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days || "7", 10) || 7, 1), 31);

  const events = await loadEvents();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Подготовим "корзины" на N дней назад включая сегодня
  const buckets = [];
  const map = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = isoDate(d);
    const item = { date: key, count: 0 };
    buckets.push(item);
    map.set(key, item);
  }

  for (const e of events) {
    const d = new Date(e.ts);
    const key = isoDate(d);
    const bucket = map.get(key);
    if (bucket) bucket.count += 1;
  }

  res.json({ days, series: buckets });
});

// 404 -> error.html
app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, "error.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
