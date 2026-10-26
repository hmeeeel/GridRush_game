const path = require("node:path");

function numberFromEnv(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultValue;

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Переменная ${name} должна быть числом, а сейчас: "${raw}"`);
  }
  return value;
}

if (!process.env.DATABASE_URL) {
  throw new Error("Нужно задать переменную DATABASE_URL");
}

module.exports = {
  // --- Сервер ---
  PORT: numberFromEnv("PORT", 3002),
  FRONTEND_DIR: path.join(__dirname, "..", "frontend"),

  // --- Поле ---
  WIDTH: numberFromEnv("GRID_WIDTH", 20),
  HEIGHT: numberFromEnv("GRID_HEIGHT", 12),

  // --- Игроки и время ---
  MAX_PLAYERS: numberFromEnv("MAX_PLAYERS", 5),
  IDLE_TIMEOUT_MS: numberFromEnv("IDLE_TIMEOUT_MS", 2 * 60_000),      // AFK-метка
  AFK_REMOVE_MS: numberFromEnv("AFK_REMOVE_MS", 5 * 60_000),          // убрать AFK с поля
  RECONNECT_GRACE_MS: numberFromEnv("RECONNECT_GRACE_MS", 20_000),    // ждём переподключения
  ROUND_MS: numberFromEnv("ROUND_MS", 5 * 60_000),                    // длина игры

  // --- Служебные таймеры ---
  PING_INTERVAL_MS: numberFromEnv("PING_INTERVAL_MS", 5000),
  SWEEP_INTERVAL_MS: numberFromEnv("SWEEP_INTERVAL_MS", 5000),

  // --- Ник ---
  NICK_MIN_LENGTH: 2,
  NICK_MAX_LENGTH: 16,

  // --- Что показывать на экране ---
  EVENTS_LIMIT: 20,
  LEADERS_LIMIT: 10,
  COLORS: [
    "#ef476f", "#06d6a0", "#118ab2", "#ffd166",
    "#9b5de5", "#f15bb5", "#00bbf9", "#00f5d4"
  ],

  // Только эти события попадают в ленту. Без этого список из 20 строк
  // забивался бы шагами PLAYER_MOVED и очки пропадали бы из ленты.
  FEED_EVENT_TYPES: new Set([
    "SCORE", "PLAYER_JOINED", "PLAYER_LEFT", "PLAYER_OFFLINE",
    "PLAYER_ONLINE", "PLAYER_AFK", "NICK_CHANGED", "GAME_ENDED"
  ]),

  // Направления: [сдвиг по x, сдвиг по y]. Диагоналей нет.
  DIRECTIONS: {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0]
  },

  // --- База данных (Supabase) ---
  DATABASE_URL: process.env.DATABASE_URL,
  DB_SSL: process.env.DB_SSL !== "false"
};