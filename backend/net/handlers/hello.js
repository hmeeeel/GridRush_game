// первое сообщение клиента.
// Токен валиден - восстановление сессии. Иначе - новый игрок
const state = require("../../game/state");
const players = require("../../game/players");
const nick = require("../../game/nick");
const persistence = require("../../db/persistence");
const { enqueue } = require("../commandQueue");
const connections = require("../connections");
const tokens = require("../tokens");
module.exports = function handleHello(ws, message) {
  enqueue(() => {
    if (ws.readyState !== ws.OPEN) return; // пока ждали очереди, вкладку закрыли
    let player = tokens.looksValid(message.token)
      ? players.findByTokenHash(tokens.hash(message.token))
      : null;
    let newToken = null;
    if (player) {

      // ---- Восстановление сессии ----
      if (!player.on_field && !players.hasFreeSlot()) {
        connections.sendError(ws, "ROOM_FULL", "Комната заполнена");
        return;
      }
      const old = connections.socketOf(player.id);
      if (old && old !== ws) old.close(); // новая вкладка вытесняет старую
      player.disconnectedAt = null;
      players.touch(player);
      if (!player.on_field) players.placeOnField(player);
      state.recordEvent("PLAYER_ONLINE", { playerId: player.id, nick: player.nick });
    } else {

      // ---- Новый игрок ----
      const name = nick.normalize(message.nick);
      const error = nick.validate(name);
      if (error) {
        connections.sendError(ws, error, nick.ERROR_TEXT[error]);
        return;
      }
      if (!players.hasFreeSlot()) {
        connections.sendError(ws, "ROOM_FULL", "Комната заполнена");
        return;
      }
      newToken = tokens.generate();
      player = players.create(name, tokens.hash(newToken));
      state.recordEvent("PLAYER_JOINED", { playerId: player.id, nick: player.nick });
    }
    connections.bind(player.id, ws);
    persistence.markDirty({ playerIds: [player.id] });
    connections.send(ws, { type: "WELCOME", playerId: player.id, token: newToken || message.token });
    connections.broadcast([]);
  });
};