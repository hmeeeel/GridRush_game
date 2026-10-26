// MOVE: клиент прислал только направление. Куда он реально попал
// и получил ли очко - решает game/rules.js. Клиентские координаты не принимаются.
const state = require("../../game/state");
const rules = require("../../game/rules");
const persistence = require("../../db/persistence");
const { enqueue } = require("../commandQueue");
const connections = require("../connections");

const MIN_MOVE_INTERVAL_MS = 80;

module.exports = function handleMove(ws, message) {
  enqueue(() => {
    const player = state.get().players[ws.playerId];
    if (!player || !connections.isOwner(ws, player.id)) return;

    const now = Date.now();
    if (now - (ws.lastMoveAt || 0) < MIN_MOVE_INTERVAL_MS) return; // не сохраняется в БД
    ws.lastMoveAt = now;

    const result = rules.applyMove(player, message.direction);
    if (!result.ok) {
      // Невалидный ход (в стену, игра окончена и т.п.) молча игнорируем.
      if (result.reason === "ROOM_FULL") connections.sendError(ws, "ROOM_FULL", "Комната заполнена");
      return;
    }

    persistence.markDirty({ playerIds: [player.id], scoreEntries: result.scoreEntries });
    connections.broadcast(result.events); // все видят ход сразу
  });
};