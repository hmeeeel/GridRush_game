// игровое поле: клетки, границы, спаун предмета
const crypto = require("node:crypto");
const { WIDTH, HEIGHT } = require("../config");
const state = require("./state");
function isInside(x, y) {
  return x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT;
}
// Случайная клетка, не входящая в список excluded
function randomCell(excluded = []) {
  const taken = new Set(excluded.map(({ x, y }) => `${x},${y}`));
  const free = [];
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) throw new Error("На поле нет свободных клеток");
  return free[Math.floor(Math.random() * free.length)];
}
// Клетка для нового игрока: любая, кроме той, где лежит предмет
function cellForNewPlayer() {
  const { item } = state.get();
  return randomCell(item ? [{ x: item.x, y: item.y }] : []);
}
// Новый предмет: не под игроком и не там, где лежал предыдущий
function spawnItem(previousPosition = null) {
  const game = state.get();
  const excluded = Object.values(game.players)
    .filter((p) => p.on_field)
    .map((p) => ({ x: p.x, y: p.y }));
  if (previousPosition) excluded.push(previousPosition);
  const { x, y } = randomCell(excluded);
  game.item = { id: crypto.randomUUID(), x, y };
  return game.item;
}
module.exports = { isInside, randomCell, cellForNewPlayer, spawnItem };