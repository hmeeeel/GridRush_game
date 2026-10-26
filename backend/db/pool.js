// подключение к Supabase 
const dns = require("node:dns");
const { Pool } = require("pg");
const { DATABASE_URL, DB, DB_SSL } = require("../config");
dns.setDefaultResultOrder("ipv4first");
const pool = new Pool({
  ...(DATABASE_URL ? { connectionString: DATABASE_URL } : DB),
  ssl: DB_SSL ? { rejectUnauthorized: false } : false,
  max: 5,
  connectionTimeoutMillis: 10_000
});
pool.on("error", (error) => {
  console.error("Ошибка соединения с БД (пул восстановится сам):", error.message);
});
async function checkConnection() {
  try {
    await pool.query("select 1");
  } catch (error) {
    let hint = "Проверьте настройки подключения.";
    if (error.code === "ENETUNREACH") {
      hint = "Сервер идёт по IPv6. Используйте Session pooler (Supabase - Connect - Session pooler).";
    } else if (error.code === "28P01") {
      hint = "Неверный пароль или логин. Для пулера логин - postgres.<ref проекта>.";
    }
    throw new Error(`Не удалось подключиться к БД: ${error.message}\n${hint}`);
  }
}
module.exports = { pool, checkConnection };