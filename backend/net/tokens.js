// восстановление сессии

// Клиент получает токен в WELCOME и хранит его в localStorage. После обрыва связи
// присылает его в HELLO - и сервер возвращает того же игрока с тем же счётом.
const crypto = require("node:crypto");
function generate() {
  return crypto.randomBytes(32).toString("hex");
}
function hash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
function looksValid(value) {
  return typeof value === "string" && value.length > 10;
}
module.exports = { generate, hash, looksValid };