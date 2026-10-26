// состояние игры в памяти. ЕДИНСТВЕННЫЙ ИСТОЧНИК ИСТИНЫ.
//
// Клиенты присылают только намерения; что произошло на самом деле - решается здесь и в rules.js.
// Остальные файлы берут состояние через get(), а не хранят свои копии
const { ROUND_MS, EVENTS_LIMIT, FEED_EVENT_TYPES } = require("../config");
let game = {
  players: {},            // playerId -> игрок (поля см. в players.js)
  item: null,             // { id, x, y } - на поле всегда ровно один предмет
  stateVersion: 0,        // растёт с каждым событием; клиент может понять, что пропустил
  totalItemsCollected: 0,
  schemaVersion: 1,
  events: [],             // лента для клиента (последние EVENTS_LIMIT)
  finished: false,
  deadline: Date.now() + ROUND_MS
};
function get() {
  return game;
}

// backup/restore нужны для отката: если БД не ответила - вернуть память как было.
function backup() {
  return structuredClone(game);
}
function restore(copy) {
  game = copy;
}

// Записать событие: увеличить версию и (если это «важное» событие) положить в ленту.
function recordEvent(type, data) {
  game.stateVersion += 1;
  const event = { type, data, stateVersion: game.stateVersion, ts: Date.now() };
  if (FEED_EVENT_TYPES.has(type)) {
    game.events.push(event);
    game.events = game.events.slice(-EVENTS_LIMIT);
  }
  return event;
}

// Заполнить состояние тем, что пришло из БД (вызывается один раз при старте).
function loadFrom(saved) {
  game.stateVersion = saved.stateVersion;
  game.totalItemsCollected = saved.totalItemsCollected;
  game.schemaVersion = saved.schemaVersion;
  game.item = saved.item;
  for (const p of saved.players) {
    game.players[p.id] = {
      ...p,
      x: p.on_field ? p.x : null,
      y: p.on_field ? p.y : null,
      afk: false,
      // После рестарта соединений нет. Кто был на поле - получает обычное время
      // на переподключение (RECONNECT_GRACE_MS), потом sweeper уберёт его с поля.
      disconnectedAt: p.on_field ? Date.now() : null
    };
  }
  game.deadline = Date.now() + ROUND_MS; // новый раунд при каждом запуске
}
module.exports = { get, backup, restore, recordEvent, loadFrom };