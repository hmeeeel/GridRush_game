const joinScreen = document.querySelector("#join-screen");
const gameScreen = document.querySelector("#game-screen");
const joinForm = document.querySelector("#join-form");
const nickInput = document.querySelector("#nick-input");
const joinError = document.querySelector("#join-error");

const board = document.querySelector("#board");
const connectionStatus = document.querySelector("#connection-status");

let socket = null;
let myPlayerId = null;
let currentNick = "";
let currentState = null;
let reconnectTimer = null;
let reconnectDelay = 1000;
let moveInterval = null;

const directionsByKey = {
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  s: "down",
  S: "down",
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right"
};

function setConnectionStatus(text, className) {
  connectionStatus.textContent = text;
  connectionStatus.className = `status ${className || ""}`;
}

function openSocket() {
  // Если уже было соединение - закрываем его, чтобы не копились лишние сокеты.
  if (socket) socket.close();

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const thisSocket = new WebSocket(`${protocol}//${location.host}`);
  socket = thisSocket;

  thisSocket.addEventListener("open", () => {
    setConnectionStatus("Online", "online");
    reconnectDelay = 1000;

    thisSocket.send(JSON.stringify({
      type: "HELLO",
      token: localStorage.getItem("gameToken"),
      nick: currentNick || nickInput.value.trim()
    }));
  });

  thisSocket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "WELCOME") {
      myPlayerId = message.playerId;
      localStorage.setItem("gameToken", message.token);
      joinError.textContent = "";
      joinScreen.classList.add("hidden");
      gameScreen.classList.remove("hidden");
      return;
    }

    if (message.type === "SNAPSHOT") {
      currentState = message;
      render();
      return;
    }

    if (message.type === "DELTA") {
      showEvent(message.event);
      return;
    }

    if (message.type === "PING") {
      // Просто возвращаем то же время. Пинг посчитает сервер и пришлёт RTT.
      thisSocket.send(JSON.stringify({
        type: "PONG",
        sentAt: message.sentAt
      }));
      return;
    }

    if (message.type === "RTT") {
      document.querySelector("#ping").textContent = `${message.ms} мс`;
      return;
    }

    if (message.type === "SERVER_SHUTDOWN") {
      // Сервер перезапускается. Соединение закроется, и сработает обычное переподключение.
      setConnectionStatus("Reconnecting…", "reconnecting");
      return;
    }

    if (message.type === "ERROR") {
      joinError.textContent = message.message || message.code;

      if (message.code === "ROOM_FULL") {
        setConnectionStatus("Комната заполнена", "");
      }

      if (message.code === "NICK_TAKEN" || message.code === "INVALID_NICK") {
        localStorage.removeItem("gameToken");
      }
    }
  });

  thisSocket.addEventListener("close", () => {
    // Это закрыли мы сами при открытии нового сокета - переподключаться не нужно.
    if (thisSocket !== socket) return;

    setConnectionStatus("Reconnecting…", "reconnecting");
    clearTimeout(reconnectTimer);

    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, 10000);
      openSocket();
    }, reconnectDelay);
  });

  thisSocket.addEventListener("error", () => {
    setConnectionStatus("Offline", "");
  });
}

joinForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const nick = nickInput.value.trim();

  if (nick.length < 2 || nick.length > 16) {
    joinError.textContent = "Ник должен содержать от 2 до 16 символов.";
    return;
  }

  currentNick = nick;
  joinError.textContent = "";
  openSocket();
});

// Страницу обновили, а токен сохранён: заходим в игру сами, без ввода ника.
if (localStorage.getItem("gameToken")) {
  openSocket();
}

function sendMove(direction) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify({
    type: "MOVE",
    direction
  }));
}

function startRepeatingMove(direction) {
  stopRepeatingMove();
  sendMove(direction);

  moveInterval = setInterval(() => {
    sendMove(direction);
  }, 140);
}

function stopRepeatingMove() {
  if (moveInterval) {
    clearInterval(moveInterval);
    moveInterval = null;
  }
}

document.addEventListener("keydown", (event) => {
  const direction = directionsByKey[event.key];

  if (!direction) return;

  // Не мешаем набирать ник: в поле ввода буквы w/a/s/d должны печататься.
  if (event.target === nickInput) return;

  event.preventDefault();

  // Не запускаем повторный интервал на каждом keydown.
  if (!event.repeat) {
    startRepeatingMove(direction);
  }
});

document.addEventListener("keyup", (event) => {
  if (directionsByKey[event.key]) {
    stopRepeatingMove();
  }
});

window.addEventListener("blur", stopRepeatingMove);

document.querySelectorAll("[data-direction]").forEach((button) => {
  const direction = button.dataset.direction;

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    startRepeatingMove(direction);
  });

  button.addEventListener("pointerup", stopRepeatingMove);
  button.addEventListener("pointerleave", stopRepeatingMove);
  button.addEventListener("pointercancel", stopRepeatingMove);
});

function renderBoard() {
  if (!currentState) return;

  const { width, height, players, item } = currentState;

  board.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${height}, 1fr)`;
  board.replaceChildren();

  const cells = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = document.createElement("div");
      cell.className = "cell coordinate";
      cell.dataset.coordinate = `${x},${y}`;
      board.appendChild(cell);
      cells.push(cell);
    }
  }

  if (item) {
    const itemCell = cells[item.y * width + item.x];
    const marker = document.createElement("div");
    marker.className = "item";
    marker.title = "Предмет";
    itemCell.appendChild(marker);
  }

  for (const player of players) {
    if (!player.onField || player.x === null || player.y === null) continue;

    const cell = cells[player.y * width + player.x];
    const marker = document.createElement("div");

    marker.className = "player-marker";
    marker.style.backgroundColor = player.color;
    marker.textContent = player.nick.slice(0, 2).toLocaleUpperCase();
    marker.title = `${player.nick}: ${player.score}`;

    if (player.id === myPlayerId) {
      marker.classList.add("me");
    }

    cell.appendChild(marker);
  }

  // Панель со своим ником и счётом (не зависит от того, стоит ли игрок на поле).
  const me = players.find((player) => player.id === myPlayerId);
  if (me) {
    document.querySelector("#my-nick").textContent = me.nick;
    document.querySelector("#my-score").textContent = me.score;
  }
}

function renderLeaders(elementId, leaders) {
  const list = document.querySelector(elementId);
  list.replaceChildren();

  for (const player of leaders) {
    const item = document.createElement("li");
    // textContent сам экранирует спецсимволы: HTML из ника не выполнится.
    item.textContent = `${player.nick} - ${player.score}`;
    list.appendChild(item);
  }
}

function renderEvents(events) {
  const list = document.querySelector("#event-list");
  list.replaceChildren();

  for (const event of [...events].reverse()) {
    const li = document.createElement("li");
    li.textContent = eventText(event);
    list.appendChild(li);
  }
}

function eventText(event) {
  const data = event.data || {};

  switch (event.type) {
    case "SCORE":
      return `${data.nick} получил очко`;
    case "PLAYER_JOINED":
      return `${data.nick} присоединился`;
    case "PLAYER_OFFLINE":
      return `${data.nick} отключился`;
    case "PLAYER_ONLINE":
      return `${data.nick} вернулся`;
    case "PLAYER_LEFT":
      return `${data.nick} покинул поле`;
    case "PLAYER_AFK":
      return `${data.nick} неактивен`;
    case "NICK_CHANGED":
      return `Новый ник: ${data.nick}`;
    case "GAME_ENDED":
      return "Игра окончена";
    default:
      return event.type;
  }
}

function showEvent(event) {
  if (event.type === "GAME_ENDED") {
    document.querySelector("#game-message").textContent = "Время игры закончилось.";
  }
}

function render() {
  if (!currentState) return;

  renderBoard();
  renderLeaders("#online-leaders", currentState.onlineLeaders);
  renderLeaders("#alltime-leaders", currentState.allTimeLeaders);
  renderEvents(currentState.events);

  document.querySelector("#online-count").textContent =
    currentState.onlineCount;

  const seconds = Math.ceil(currentState.remainingMs / 1000);
  const minutesText = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secondsText = String(seconds % 60).padStart(2, "0");

  document.querySelector("#timer").textContent =
    `${minutesText}:${secondsText}`;

  if (currentState.finished) {
    document.querySelector("#game-message").textContent =
      "Время игры закончилось.";
  }
}