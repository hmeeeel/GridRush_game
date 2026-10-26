// сообщение SNAPSHOT- полное состояние для клиента
const { WIDTH, HEIGHT, EVENTS_LIMIT, LEADERS_LIMIT } = require("../config");
const state = require("./state");
const players = require("./players");
function make(onlineIds) {
  const game = state.get();
  const list = Object.values(game.players).map((p) => players.toPublic(p, onlineIds.has(p.id)));
  const byScore = (a, b) => b.score - a.score;
  return {
    type: "SNAPSHOT",
    stateVersion: game.stateVersion,
    totalItemsCollected: game.totalItemsCollected,
    item: game.item,
    players: list,
    onlineCount: onlineIds.size,
    events: game.events.slice(-EVENTS_LIMIT),
    onlineLeaders: list.filter((p) => p.online).sort(byScore).slice(0, LEADERS_LIMIT),
    allTimeLeaders: [...list].sort(byScore).slice(0, LEADERS_LIMIT), // score живёт в БД вечно
    remainingMs: Math.max(0, game.deadline - Date.now()),
    finished: game.finished,
    width: WIDTH,
    height: HEIGHT
  };
}
module.exports = { make };