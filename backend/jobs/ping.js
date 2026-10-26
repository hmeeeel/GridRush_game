// раз в PING_INTERVAL_MS шлём всем PING с текущим временем.
// Клиент отвечает PONG с тем же sentAt.
const { PING_INTERVAL_MS } = require("../config");
const connections = require("../net/connections");
function start() {
  return setInterval(() => {
    for (const ws of connections.all()) {
      connections.send(ws, { type: "PING", sentAt: Date.now() });
    }
  }, PING_INTERVAL_MS);
}
module.exports = { start };