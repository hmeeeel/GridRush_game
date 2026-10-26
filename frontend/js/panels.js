import { $ } from "./dom.js";

const STATUS_TEXT = { online: "Online", reconnecting: "Reconnecting…", offline: "Offline" };

// Чтобы показать новое событие, достаточно добавить строку сюда.
const EVENT_TEXT = {
  SCORE: "получил очко",
  PLAYER_JOINED: "присоединился",
  PLAYER_OFFLINE: "отключился",
  PLAYER_ONLINE: "вернулся",
  PLAYER_LEFT: "покинул поле",
  PLAYER_AFK: "неактивен",
};

export function setStatus(status) {
  const badge = $("status");
  badge.textContent = STATUS_TEXT[status];
  badge.dataset.state = status;
}

export function setPing(ms) {
  $("ping").textContent = ms;
}

export function renderHud(state, me) {
  if (me) {
    $("my-nick").textContent = me.nick;
    $("my-score").textContent = me.score;
  }
  $("online-count").textContent = state.onlineCount;
  $("timer").textContent = formatTime(state.remainingMs);
}

export function renderLeaders(list, leaders, myNick) {
  list.replaceChildren(...leaders.map((leader, index) => {
    const li = document.createElement("li");
    if (leader.nick === myNick) li.classList.add("me");
    li.append(span("rank", index + 1), span("name", leader.nick), span("pts", leader.score));
    return li;
  }));
}

export function renderEvents(list, events) {
  // Последние 20, новые сверху.
  list.replaceChildren(...events.slice(-20).reverse().map((event) => {
    const li = document.createElement("li");
    li.textContent = eventText(event);
    return li;
  }));
}

function eventText({ type, data = {} }) {
  if (type === "GAME_ENDED") return "Игра окончена";
  if (type === "NICK_CHANGED") return `Новый ник: ${data.nick}`;
  return EVENT_TEXT[type] ? `${data.nick} ${EVENT_TEXT[type]}` : type;
}

function formatTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

// textContent вместо innerHTML: ник нельзя использовать для вставки HTML.
function span(className, text) {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text;
  return element;
}
