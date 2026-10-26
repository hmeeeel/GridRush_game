// смена ника.
const state = require("../../game/state");
const nick = require("../../game/nick");
const { commitOrRollback } = require("../../game/transaction");
const { enqueue } = require("../commandQueue");
const connections = require("../connections");
module.exports = function handleSetNick(ws, message) {
  enqueue(async () => {
    const player = state.get().players[ws.playerId];
    if (!player || !connections.isOwner(ws, player.id)) return;
    const name = nick.normalize(message.nick);
    const error = nick.validate(name, player.id);
    if (error) {
      connections.sendError(ws, error, nick.ERROR_TEXT[error]);
      return;
    }
    const backup = state.backup();
    player.nick = name;
    const event = state.recordEvent("NICK_CHANGED", { playerId: player.id, nick: name });
    try {
      await commitOrRollback(backup);
    } catch (err) {
      console.error("Не удалось сохранить ник:", err);
      connections.sendError(ws, "STORAGE_ERROR", "Не удалось сохранить ник");
      return;
    }
    connections.broadcast([event]);
  });
};