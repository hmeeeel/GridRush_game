// MOVE: клиент прислал только направление. Куда он реально попал
// и получил ли очко - решает game/rules.js. Клиентские координаты не принимаются.
const state = require("../../game/state");
const rules = require("../../game/rules");
const { commitOrRollback } = require("../../game/transaction");
const { enqueue } = require("../commandQueue");
const connections = require("../connections");

const movesInFlight = new Set();

module.exports = function handleMove(ws, message) {
  const playerId = ws.playerId;

  if (movesInFlight.has(playerId)) return; //лишний ход даже не попадает в очередь
  movesInFlight.add(playerId);

  enqueue(async () => {
    try {
      await processMove(ws, message);
    } finally {
      movesInFlight.delete(playerId);
    }
  });
};

async function processMove(ws, message) {
  const player = state.get().players[ws.playerId];
  if (!player || !connections.isOwner(ws, player.id)) return;

  const backup = state.backup();
  const result = rules.applyMove(player, message.direction);

  if (!result.ok) {
    // Невалидный ход (в стену, вне очереди и т.п.) молча игнорируем - клиент не должен был его слать.
    if (result.reason === "ROOM_FULL") connections.sendError(ws, "ROOM_FULL", "Комната заполнена");
    return;
  }

  connections.broadcast(result.events); // все видят ход сразу
  try {
    await commitOrRollback(backup, result.scoreEntries);
  } catch (error) {
    console.error("Не удалось сохранить ход:", error);
    connections.sendError(ws, "STORAGE_ERROR", "Ход не сохранён");
    return;
  }
}
