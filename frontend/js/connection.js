import { session } from "./session.js";

// Отвечает только за сокет: открыть, переподключить, отправить.
// Что делать с сообщениями, решает тот, кто создал Connection (main.js).
export class Connection {
  constructor({ onStatus, onMessage }) {
    this.onStatus = onStatus;
    this.onMessage = onMessage;
    this.socket = null;
    this.nick = "";
    this.active = false;
    this.delay = 1000;
    this.timer = null;

    // Интернет вернулся - не ждём таймер, подключаемся сразу.
    window.addEventListener("online", () => this.active && this.socket?.readyState !== WebSocket.OPEN && this.open());
    window.addEventListener("offline", () => this.active && this.onStatus("offline"));
  }

  start(nick) {
    this.nick = nick;
    this.active = true;
    this.open();
  }

  stop() {
    this.active = false;
    clearTimeout(this.timer);
    this.closeSocket();
    this.onStatus("offline");
  }

  send(message) {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(message));
  }

  open() {
    clearTimeout(this.timer);
    this.closeSocket();

    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${location.host}`);
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.delay = 1000;
      this.onStatus("online");
      this.send({ type: "HELLO", token: session.getToken(), nick: this.nick });
    });

    socket.addEventListener("message", (event) => this.handle(JSON.parse(event.data)));

    socket.addEventListener("close", () => {
      if (socket !== this.socket) return; // этот сокет мы закрыли сами
      this.onStatus(navigator.onLine ? "reconnecting" : "offline");
      this.timer = setTimeout(() => this.open(), this.delay);
      this.delay = Math.min(this.delay * 2, 10000);
    });
  }

  closeSocket() {
    const old = this.socket;
    this.socket = null;
    old?.close();
  }

  handle(message) {
    if (message.type === "PING") {
      // Возвращаем то же время: пинг посчитает сервер и пришлёт RTT.
      this.send({ type: "PONG", sentAt: message.sentAt });
      return;
    }
    if (message.type === "SERVER_SHUTDOWN") {
      this.delay = message.retryAfterMs || this.delay;
      this.onStatus("reconnecting");
    }
    this.onMessage(message);
  }
}
