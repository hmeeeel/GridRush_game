// ответ на серверный PING
const connections = require("../connections");
module.exports = function handlePong(ws, message) {
  const sentAt = Number(message.sentAt);
  if (!Number.isFinite(sentAt)) return;
  ws.rtt = Math.max(0, Date.now() - sentAt); // не сохраняется в БД
  connections.send(ws, { type: "RTT", ms: ws.rtt });
};