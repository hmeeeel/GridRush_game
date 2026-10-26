// сокет закрылся
// Игрока НЕ удаляем: ставим отметку времени. Если за RECONNECT_GRACE_MS он не вернётся,
// jobs/sweeper.js уберёт его с поля. Счёт в любом случае сохраняется.
const state = require("../../game/state");
const persistence = require("../../db/persistence");
const { enqueue } = require("../commandQueue");
const connections = require("../connections");
module.exports = function handleDisconnect(ws, playerId) {
  enqueue(() => {
    if (!connections.isOwner(ws, playerId)) return; // это старый сокет, игрок уже переподключился
    const player = state.get().players[playerId];
    connections.unbind(playerId);
    if (!player) return;
    player.disconnectedAt = Date.now();
    const event = state.recordEvent("PLAYER_OFFLINE", { playerId, nick: player.nick });
    persistence.markDirty();
    connections.broadcast([event]);
  });
};