// сокет закрылся
// Игрока НЕ удаляем: ставим отметку времени. Если за RECONNECT_GRACE_MS он не вернётся,
// jobs/sweeper.js уберёт его с поля. Счёт в любом случае сохраняется.
const state = require("../../game/state");
const { commitOrRollback } = require("../../game/transaction");
const { enqueue } = require("../commandQueue");
const connections = require("../connections");
module.exports = function handleDisconnect(ws, playerId) {
  enqueue(async () => {
    if (!connections.isOwner(ws, playerId)) return; // это старый сокет, игрок уже переподключился
    const backup = state.backup();
    const player = state.get().players[playerId];
    connections.unbind(playerId);
    if (!player) return;
    player.disconnectedAt = Date.now();
    const event = state.recordEvent("PLAYER_OFFLINE", { playerId, nick: player.nick });
    try {
      await commitOrRollback(backup);
      connections.broadcast([event]);
    } catch (error) {
      console.error("Не удалось сохранить отключение:", error);
    }
  });
};