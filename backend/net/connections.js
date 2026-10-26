// синхронизация через WebSockets.
//
// Хранит, какой сокет принадлежит какому игроку, и умеет рассылать всем.
// Это единственное место, которое вызывает ws.send().
const WebSocket = require("ws");
const snapshot = require("../game/snapshot");
const sockets = new Map();
function send(ws, message) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}
function sendError(ws, code, message) {
  send(ws, { type: "ERROR", code, message });
}
function bind(playerId, ws) {
  sockets.set(playerId, ws);
  ws.playerId = playerId; // с этого момента сокет «знает», чей он
}
function unbind(playerId) {
  sockets.delete(playerId);
}
function socketOf(playerId) {
  return sockets.get(playerId);
}

// Защита от «призраков»: старое соединение не должно управлять игроком, который уже переподключился.
function isOwner(ws, playerId) {
  return sockets.get(playerId) === ws;
}
function onlineIds() {
  return new Set(sockets.keys());
}
function all() {
  return sockets.values();
}

// Разослать всем: сначала события (DELTA), затем полный SNAPSHOT.
// Для маленькой комнаты снапшот после каждого хода дешевле, чем сложная логика дельт на клиенте.
function broadcast(events) {
  const full = snapshot.make(onlineIds());
  for (const ws of sockets.values()) {
    for (const event of events) send(ws, { type: "DELTA", event });
    send(ws, full);
  }
}
module.exports = { send, sendError, bind, unbind, socketOf, isOwner, onlineIds, all, broadcast };