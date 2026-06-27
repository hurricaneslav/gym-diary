/**
 * api.js — все запросы к серверу
 * ЗАМЕНИ на свой URL после деплоя на Railway
 */

// ← Сюда вставишь ссылку с Railway после деплоя
// Например: "https://gym-diary-production.up.railway.app"
export const API_URL = import.meta.env.VITE_API_URL || "";

/** Получить initData от Telegram (или заглушку для браузера) */
function getInitData() {
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }
  // Заглушка для тестирования в браузере без Telegram
  return "user=%7B%22id%22%3A12345%2C%22first_name%22%3A%22Test%22%7D&hash=dev";
}

async function request(method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-init-data": getInitData(),
      "x-user-id": "placeholder", // бэкенд игнорирует, берёт из initData
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Тренировки ────────────────────────────────────────────────────────────────
export const api = {
  getWorkouts:      ()      => request("GET",    "/workouts"),
  saveWorkout:      (w)     => request("POST",   "/workouts", w),
  deleteWorkout:    (id)    => request("DELETE", `/workouts/${id}`),
  getMeasurements:  ()      => request("GET",    "/measurements"),
  saveMeasurement:  (m)     => request("POST",   "/measurements", {
    ...m,
    // Собираем все замеры в поле data
    data: Object.fromEntries(
      Object.entries(m).filter(([k]) =>
        !["id","name","date"].includes(k) && m[k] !== "" && m[k] != null
      )
    ),
  }),
  deleteMeasurement: (id)   => request("DELETE", `/measurements/${id}`),
};
