// два игрока одновременно шагают на предмет.
// Команды приходят сюда строго по одной. Первый, кто дошёл до
// предмета, получает очко, и spawnItem() тут же меняет game.item (новый id, новая клетка).
// Второй игрок, чей MOVE обрабатывается следом, уже не найдёт предмета в этой клетке -
// его ход завершится обычным перемещением без очка.

const { DIRECTIONS } = require("../config");
const state = require("./state");
const field = require("./field");
const players = require("./players");


function applyMove(player, directionName) {
  const game = state.get();
  const direction = DIRECTIONS[directionName];
  if (game.finished) return { ok: false, reason: "GAME_FINISHED" };
  if (!direction) return { ok: false, reason: "BAD_DIRECTION" };
  const events = [];
  const scoreEntries = [];

  // Игрока убрали с поля за неактивность - любой ход возвращает его.
  if (!player.on_field) {
    if (!players.placeOnField(player)) return { ok: false, reason: "ROOM_FULL" };
    events.push(state.recordEvent("PLAYER_JOINED", { playerId: player.id, nick: player.nick }));
    return { ok: true, events, scoreEntries };
  }
  const nextX = player.x + direction[0];
  const nextY = player.y + direction[1];
  if (!field.isInside(nextX, nextY)) return { ok: false, reason: "OUT_OF_BOUNDS" };
  player.x = nextX;
  player.y = nextY;
  players.touch(player);
  events.push(state.recordEvent("PLAYER_MOVED", { playerId: player.id, x: nextX, y: nextY }));

  // Дошёл до предмета?
  const item = game.item;
  if (item && item.x === nextX && item.y === nextY) {
    player.score += 1;
    game.totalItemsCollected += 1;

    // Запись в журнал ссылается на itemId - по нему БД не даст начислить очко дважды.
    scoreEntries.push({ playerId: player.id, itemId: item.id, x: item.x, y: item.y });
    events.push(state.recordEvent("SCORE", {
      playerId: player.id, nick: player.nick, score: player.score, itemId: item.id
    }));

    // Сразу новый предмет - следующий игрок в очереди увидит уже его.
    const next = field.spawnItem({ x: item.x, y: item.y });
    events.push(state.recordEvent("ITEM_SPAWNED", { itemId: next.id, x: next.x, y: next.y }));
  }
  return { ok: true, events, scoreEntries };
}
module.exports = { applyMove };