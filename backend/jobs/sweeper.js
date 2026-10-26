//  фоновая «уборка» раз в SWEEP_INTERVAL_MS.
//  IDLE_TIMEOUT_MS без ходов - пометить AFK (остаётся на поле)
//  AFK_REMOVE_MS - убрать с поля (счёт сохраняется)
//  RECONNECT_GRACE_MS после отключения - убрать с поля (ДОП. ТРЕБОВАНИЕ 2)
//  истёк ROUND_MS - игра окончена
const { IDLE_TIMEOUT_MS, AFK_REMOVE_MS, RECONNECT_GRACE_MS, SWEEP_INTERVAL_MS } = require("../config");
const state = require("../game/state");
const players = require("../game/players");
const persistence = require("../db/persistence");
const { enqueue } = require("../net/commandQueue");
const connections = require("../net/connections");
function sweep() {
  return enqueue(() => {
    const game = state.get();
    const events = [];
    const changedPlayerIds = []; // кого убрали с поля - у них изменилась строка в БД
    const now = Date.now();
    for (const player of Object.values(game.players)) {
      if (!player.on_field) continue;
      const idleMs = now - new Date(player.last_seen_at).getTime();
      if (idleMs >= IDLE_TIMEOUT_MS && !player.afk) {
        player.afk = true;
        events.push(state.recordEvent("PLAYER_AFK", { playerId: player.id, nick: player.nick }));
      }
      const afkTooLong = idleMs >= AFK_REMOVE_MS;
      const goneTooLong = player.disconnectedAt && now - player.disconnectedAt >= RECONNECT_GRACE_MS;
      if (afkTooLong || goneTooLong) {
        players.removeFromField(player);
        changedPlayerIds.push(player.id); // изм игроков
        events.push(state.recordEvent("PLAYER_LEFT", {
          playerId: player.id, nick: player.nick, reason: afkTooLong ? "AFK" : "DISCONNECTED"
        }));
      }
    }
    if (!game.finished && now >= game.deadline) {
      game.finished = true;
      events.push(state.recordEvent("GAME_ENDED", {}));
    }
    if (events.length === 0) return;
    persistence.markDirty({ playerIds: changedPlayerIds });
    connections.broadcast(events);
  });
}
function start() {
  return setInterval(sweep, SWEEP_INTERVAL_MS);
}
module.exports = { start };