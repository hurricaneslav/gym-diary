/**
 * api.js — все запросы к серверу
 */

export const API_URL = import.meta.env.VITE_API_URL || "";
// Юзернейм бота (без @) — нужен для генерации ссылки-приглашения. Задаётся через .env / GitHub Secret VITE_BOT_USERNAME
export const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || "";

/** Получить initData от Telegram (или заглушку для браузера) */
function getInitData() {
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }
  // Заглушка для тестирования в браузере без Telegram
  return "user=%7B%22id%22%3A12345%2C%22first_name%22%3A%22Test%22%7D&hash=dev";
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Делает запрос с автоматическими повторами при сетевых сбоях или холодном
 * старте бэкенда (Railway иногда "просыпается" несколько секунд — первый
 * запрос может не дождаться ответа, особенно на нестабильном соединении/VPN).
 * Повторяем только при сетевых ошибках и 502/503/504 — не при 4xx, там
 * повтор не поможет (это ошибка запроса, а не временная недоступность).
 */
async function request(method, path, body, attempt = 1) {
  const MAX_ATTEMPTS = 3;
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-init-data": getInitData(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    // fetch сам бросает исключение при обрыве соединения/недоступности сервера
    if (attempt < MAX_ATTEMPTS) {
      await sleep(attempt * 800);
      return request(method, path, body, attempt + 1);
    }
    throw networkErr;
  }

  if (!res.ok) {
    const isRetryable = [502, 503, 504].includes(res.status);
    if (isRetryable && attempt < MAX_ATTEMPTS) {
      await sleep(attempt * 800);
      return request(method, path, body, attempt + 1);
    }
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // ── Тренировки ──────────────────────────────────────────────────────────
  getWorkouts:      ()      => request("GET",    "/workouts"),
  saveWorkout:      (w)     => request("POST",   "/workouts", w),
  deleteWorkout:    (id)    => request("DELETE", `/workouts/${id}`),

  // ── Замеры ──────────────────────────────────────────────────────────────
  getMeasurements:  ()      => request("GET",    "/measurements"),
  saveMeasurement:  (m)     => request("POST",   "/measurements", {
    ...m,
    data: Object.fromEntries(
      Object.entries(m).filter(([k]) =>
        !["id","name","date"].includes(k) && m[k] !== "" && m[k] != null
      )
    ),
  }),
  deleteMeasurement: (id)   => request("DELETE", `/measurements/${id}`),

  // ── Профили ─────────────────────────────────────────────────────────────
  getProfiles:      ()          => request("GET",    "/profiles"),
  createProfile:    (name)      => request("POST",   "/profiles", { name }),
  updateProfile:    (id, patch) => request("PUT",    `/profiles/${id}`, patch),
  deleteProfile:    (id)        => request("DELETE", `/profiles/${id}`),
  activateProfile:  (id)        => request("POST",   `/profiles/${id}/activate`),

  // ── Друзья ──────────────────────────────────────────────────────────────
  getInviteCode:      ()         => request("GET",    "/me/invite-link"),
  getFriends:         ()         => request("GET",    "/friends"),
  searchFriend:       (q)        => request("GET",    `/friends/search?q=${encodeURIComponent(q)}`),
  addFriendByUsername:(username) => request("POST",   "/friends/add-by-username", { username }),
  addFriendByCode:    (code)     => request("POST",   "/friends/add-by-code", { code }),
  removeFriend:       (id)       => request("DELETE", `/friends/${id}`),
  getFriendProfile:   (id)       => request("GET",    `/friends/${id}/profile`),
};
