// Рисует поле по снимку состояния. Про сеть ничего не знает.
export function renderBoard(board, state, myId) {
  const { width, height, players, item } = state;
  const me = players.find((player) => player.id === myId);

  board.style.setProperty("--cols", width);
  board.style.setProperty("--rows", height);
  board.replaceChildren();

  const cells = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      // Координатная подсветка: строка и столбец нашего игрока.
      if (me?.onField && (me.x === x || me.y === y)) cell.classList.add("lane");
      board.appendChild(cell);
      cells.push(cell);
    }
  }

  if (item) addMarker(cells[item.y * width + item.x], "item", "");

  for (const player of players) {
    if (!player.onField || player.x === null || player.y === null) continue;

    // textContent сам экранирует спецсимволы: HTML из ника не выполнится.
    const marker = addMarker(cells[player.y * width + player.x], "player", player.nick.slice(0, 2).toLocaleUpperCase());
    marker.style.backgroundColor = player.color;
    marker.title = `${player.nick}: ${player.score}`;
    if (player.afk || !player.online) marker.classList.add("idle");
    if (player.id === myId) marker.classList.add("me");
  }
}

function addMarker(cell, className, text) {
  const marker = document.createElement("div");
  marker.className = className;
  marker.textContent = text;
  cell.appendChild(marker);
  return marker;
}
