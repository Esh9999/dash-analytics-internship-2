import { getJSON, postJSON } from "./api.js";

function el(id) { return document.getElementById(id); }

function drawBarChart(canvas, series) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;

  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, cssW, cssH);

  const padding = 16;
  const w = cssW - padding * 2;
  const h = cssH - padding * 2;

  // оси
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, padding + h);
  ctx.lineTo(padding + w, padding + h);
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;

  const max = Math.max(1, ...series.map(s => s.count));
  const barGap = 6;
  const barW = Math.max(10, (w - barGap * (series.length - 1)) / series.length);

  for (let i = 0; i < series.length; i++) {
    const x = padding + i * (barW + barGap);
    const barH = Math.round((series[i].count / max) * (h - 24));
    const y = padding + (h - barH);

    // столбик
    ctx.fillStyle = "rgba(122,162,255,0.75)";
    ctx.fillRect(x, y, barW, barH);

    // подпись (день)
    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = "12px system-ui";
    const label = series[i].date.slice(5); // MM-DD
    const tw = ctx.measureText(label).width;
    ctx.fillText(label, x + (barW - tw) / 2, padding + h + 14);
  }
}

async function trackOpen() {
  await postJSON("/api/event", { page: "analytics", action: "open" });
}

async function refresh(days = 14) {
  const data = await getJSON(`/api/series?days=${days}`);
  el("days").textContent = String(data.days);
  const total = (data.series || []).reduce((acc, s) => acc + s.count, 0);
  el("totalInRange").textContent = String(total);

  const canvas = el("chart");
  drawBarChart(canvas, data.series || []);
}

(async function init() {
  try {
    await trackOpen();
  } catch (e) {
    console.warn("Не удалось отправить событие:", e);
  }

  try {
    await refresh(14);
  } catch (e) {
    el("apiStatus").textContent = "Сервер недоступен или API вернул ошибку.";
    console.error(e);
  }

  window.addEventListener("resize", () => {
    // перерисуем под новый размер
    refresh(14).catch(() => {});
  });
})();
