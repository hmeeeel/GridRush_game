// приём сообщений по WebSocket.
// Разбирает JSON и отдаёт сообщение нужному обработчику.
const connections = require("./connections");
const handleHello = require("./handlers/hello");
const handleDisconnect = require("./handlers/disconnect");
const HANDLERS = {
  MOVE: require("./handlers/move"),
  SET_NICK: require("./handlers/setNick"),
  PONG: require("./handlers/pong")
};
function handleMessage(ws, raw) {
  let message;
  try {
    message = JSON.parse(raw.toString());
  } catch {
    return connections.sendError(ws, "BAD_JSON", "Сообщение должно быть JSON");
  }
  if (!message || typeof message !== "object") {
    return connections.sendError(ws, "BAD_JSON", "Сообщение должно быть JSON-объектом");
  }
  if (message.type === "HELLO") return handleHello(ws, message);
  if (!ws.playerId) {
    return connections.sendError(ws, "NOT_AUTHENTICATED", "Сначала отправьте HELLO");
  }
  const handler = HANDLERS[message.type];
  if (handler) handler(ws, message);
}
// Подключить роутер к WebSocket-серверу.
function attach(wss) {
  wss.on("connection", (ws) => {
    ws.playerId = null; // заполнит handlers/hello.js
    ws.on("message", (raw) => handleMessage(ws, raw));
    ws.on("close", () => { if (ws.playerId) handleDisconnect(ws, ws.playerId); });
    ws.on("error", (error) => console.error("Ошибка WebSocket:", error.message));
  });
}
module.exports = { attach };