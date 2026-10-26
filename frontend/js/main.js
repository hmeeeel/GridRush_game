import { $ } from "./dom.js";
import { session } from "./session.js";
import { Connection } from "./connection.js";
import { NickDialog } from "./dialog.js";
import { setupInput } from "./input.js";
import { renderBoard } from "./board.js";
import { renderHud, renderLeaders, renderEvents, setStatus, setPing } from "./panels.js";

let myId = null;
let gameEnded = false;
let toastTimer = null;

const connection = new Connection({ onStatus, onMessage });
const dialog = new NickDialog(onNickSubmit);

function onStatus(status) {
  setStatus(status);
  $("board").classList.toggle("stale", status !== "online");
  // Пока нет связи, вход не подтверждён: после переподключения придёт новый WELCOME.
  if (status !== "online") myId = null;
}

// Для каждого типа сообщения сервера свой обработчик. Новый тип = новая строка.
const handlers = {
  WELCOME(message) {
    myId = message.playerId;
    session.saveToken(message.token);
    dialog.close();
  },
  SNAPSHOT: render,
  RTT(message) {
    setPing(message.ms);
  },
  ERROR: onError,
};

function onMessage(message) {
  handlers[message.type]?.(message);
}

function render(state) {
  const me = state.players.find((player) => player.id === myId);

  renderBoard($("board"), state, myId);
  renderHud(state, me);
  renderLeaders($("online-leaders"), state.onlineLeaders, me?.nick);
  renderLeaders($("alltime-leaders"), state.allTimeLeaders, me?.nick);
  renderEvents($("event-list"), state.events);

  if (state.finished && !gameEnded) {
    gameEnded = true;
    showToast("Время игры закончилось.");
  }
}

function onError({ code, message }) {
  const text = message || code;

  // Уже в игре: ошибка не про вход. Не удалась смена ника или что-то другое.
  if (myId !== null) {
    if (code === "NICK_TAKEN" || code === "INVALID_NICK") askNick(text);
    else showToast(text);
    return;
  }

  // Войти не удалось: останавливаем переподключения и просим ник заново.
  connection.stop();
  if (code !== "ROOM_FULL") session.clear();
  askNick(text);
}

function onNickSubmit(nick) {
  if (myId === null) {
    connection.start(nick);
  } else {
    connection.send({ type: "SET_NICK", nick });
    dialog.close();
  }
}

function askNick(error = "") {
  dialog.open(myId === null
    ? { title: "GridRush", button: "Играть", canCancel: false, error }
    : { title: "Новый ник", button: "Сменить", canCancel: true, error });
}

function showToast(text) {
  const toast = $("toast");
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  // Сообщение «игра окончена» остаётся, остальные пропадают через 3 секунды.
  if (!gameEnded) toastTimer = setTimeout(() => { toast.hidden = true; }, 3000);
}

setupInput((direction) => connection.send({ type: "MOVE", direction }));
$("rename-btn").addEventListener("click", () => askNick());

// Токен есть (страницу обновили) - входим сами, иначе спрашиваем ник.
if (session.getToken()) connection.start("");
else askNick();
