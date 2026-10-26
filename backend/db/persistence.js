// Сохранение в БД В ФОНЕ
const state = require("../game/state");
const repository = require("./gameRepository");

const FLUSH_DELAY_MS = 500;
const RETRY_DELAY_MS = 3000;

const dirtyPlayerIds = new Set(); // чьи строки в players нужно перезаписать
let pendingScores = [];           // новые записи журнала очков
let stateDirty = false;           // нужно ли обновить game_state
let timer = null;
let current = null;               // промис сохранения, которое идёт прямо сейчас

// Сообщить: «в памяти что-то изменилось, сохрани когда будет время»
function markDirty({ playerIds = [], scoreEntries = [] } = {}) {
  stateDirty = true;
  for (const id of playerIds) dirtyPlayerIds.add(id);
  pendingScores.push(...scoreEntries);
  schedule(FLUSH_DELAY_MS);
}

function schedule(delay) {
  if (timer || current) return; // таймер уже стоит или сохранение идёт - ничего не делаем
  timer = setTimeout(flush, delay);
}

// Забирает накопленное и пишет в БД. Возвращает true, если получилось.
async function save() {
  const game = state.get();
  const ids = [...dirtyPlayerIds];
  const scores = pendingScores;
  dirtyPlayerIds.clear();
  pendingScores = [];
  stateDirty = false;

  // Пишем только тех игроков, которые изменились, а не всех
  const players = ids.map((id) => game.players[id]).filter(Boolean);
  try {
    await repository.save(game, players, scores);
    return true;
  } catch (error) {
    console.error("Не удалось сохранить в БД, повторю позже:", error.message);
    ids.forEach((id) => dirtyPlayerIds.add(id));
    pendingScores = [...scores, ...pendingScores];
    stateDirty = true;
    return false;
  }
}

// Сохранить сейчас. Два сохранения одновременно не запускаются
function flush() {
  clearTimeout(timer);
  timer = null;
  if (current) return current;
  if (!stateDirty) return Promise.resolve();
  current = save().then((ok) => {
    current = null;
    if (stateDirty) schedule(ok ? FLUSH_DELAY_MS : RETRY_DELAY_MS);
  });
  return current;
}

// Для остановки сервера: дождаться текущего сохранения и записать остаток
async function flushNow() {
  if (current) await current;
  await flush();
}

module.exports = { markDirty, flushNow };