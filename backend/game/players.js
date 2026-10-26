// всё про игроков: создать, вернуть на поле, убрать, лимит MAX_PLAYERS
const crypto = require("node:crypto");
const { MAX_PLAYERS, COLORS } = require("../config");
const state = require("./state");
const field = require("./field");
function countOnField() {
  return Object.values(state.get().players).filter((p) => p.on_field).length;
}
function hasFreeSlot() {
  return countOnField() < MAX_PLAYERS;
}
function findByTokenHash(tokenHash) {
  return Object.values(state.get().players).find((p) => p.token_hash === tokenHash) || null;
}
function create(nick, tokenHash) {
  const { x, y } = field.cellForNewPlayer();
  const now = new Date().toISOString();
  const player = {
    id: crypto.randomUUID(),
    token_hash: tokenHash,
    nick,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    score: 0,
    x, y,
    on_field: true,
    created_at: now,
    last_seen_at: now,
    afk: false,            // не сохраняется в БД
    disconnectedAt: null   // не сохраняется в БД
  };
  state.get().players[player.id] = player;
  return player;
}
// Вернуть на поле игрока, которого ранее убрали. false - мест нет
function placeOnField(player) {
  if (!hasFreeSlot()) return false;
  const { x, y } = field.cellForNewPlayer();
  player.x = x;
  player.y = y;
  player.on_field = true;
  touch(player);
  return true;
}
// Убрать с поля. Счёт сохраняется - игрок остаётся в базе и в таблице лидеров
function removeFromField(player) {
  player.on_field = false;
  player.x = null;
  player.y = null;
  player.disconnectedAt = null;
}
// «Игрок проявил активность» - сбросить AFK и обновить время
function touch(player) {
  player.last_seen_at = new Date().toISOString();
  player.afk = false;
}
// Что отправляем клиентам. Токен-хэш наружу не уходит
function toPublic(player, online) {
  return {
    id: player.id,
    nick: player.nick,
    color: player.color,
    score: player.score,
    x: player.x,
    y: player.y,
    onField: player.on_field,
    online,
    afk: Boolean(player.afk)
  };
}
module.exports = { countOnField, hasFreeSlot, findByTokenHash, create, placeOnField, removeFromField, touch, toPublic };