// смена ника.
const state = require("../../game/state");
const nick = require("../../game/nick");
const persistence = require("../../db/persistence");
const { enqueue } = require("../commandQueue");
const connections = require("../connections");
module.exports = function handleSetNick(ws, message) {
  enqueue(() => {
    const player = state.get().players[ws.playerId];
    if (!player || !connections.isOwner(ws, player.id)) return;
    const name = nick.normalize(message.nick);
    const error = nick.validate(name, player.id);
    if (error) {
      connections.sendError(ws, error, nick.ERROR_TEXT[error]);
      return;
    }
    player.nick = name;
    const event = state.recordEvent("NICK_CHANGED", { playerId: player.id, nick: name });
    persistence.markDirty({ playerIds: [player.id] });
    connections.broadcast([event]);
  });
};