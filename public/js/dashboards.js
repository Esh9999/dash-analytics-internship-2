import { getJSON, postJSON, formatTs } from "./api.js";

function el(id) { return document.getElementById(id); }

function renderSummary(data) {
  el("totalEvents").textContent = String(data.totalEvents ?? 0);

  const pages = data.totalsByPage || {};
  el("dashCount").textContent = String(pages.dashboards ?? 0);
  el("analyticsCount").textContent = String(pages.analytics ?? 0);

  const list = el("lastEvents");
  list.innerHTML = "";
  const items = (data.lastEvents || []).map(e => {
    const li = document.createElement("li");
    li.textContent = `${formatTs(e.ts)} • ${e.page} • ${e.action}`;
    return li;
  });

  if (items.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Пока событий нет. Нажмите «Сгенерировать событие», чтобы увидеть обновления.";
    list.appendChild(li);
    return;
  }

  for (const li of items) list.appendChild(li);
}

async function refresh() {
  const data = await getJSON("/api/summary");
  renderSummary(data);
}

async function trackOpen() {
  // фиксируем открытие страницы
  await postJSON("/api/event", { page: "dashboards", action: "open" });
}

async function createManualEvent() {
  await postJSON("/api/event", { page: "dashboards", action: "manual_click" });
  await refresh();
}

(async function init() {
  try {
    await trackOpen();
  } catch (e) {
    console.warn("Не удалось отправить событие:", e);
  }

  try {
    await refresh();
  } catch (e) {
    // если API не доступно - покажем дружелюбное сообщение
    el("apiStatus").textContent = "Сервер недоступен или API вернул ошибку.";
    console.error(e);
  }

  el("btnEvent").addEventListener("click", () => createManualEvent());
  el("btnRefresh").addEventListener("click", () => refresh());
})();
