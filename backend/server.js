// server.js - точка входа. Здесь нет логики, только сборка модулей и запуск.
// Порядок: проверить БД - загрузить игру - поднять HTTP + WebSocket - запустить таймеры.
const http = require("node:http");
const WebSocket = require("ws");
const { PORT } = require("./config");
const { pool, checkConnection } = require("./db/pool");
const repository = require("./db/gameRepository");
const state = require("./game/state");
const field = require("./game/field");
const staticFiles = require("./http/static");
const router = require("./net/router");
const connections = require("./net/connections");
const { whenIdle } = require("./net/commandQueue");
const sweeper = require("./jobs/sweeper");
const ping = require("./jobs/ping");
async function start() {
  // ТРЕБОВАНИЕ 3: восстанавливаем игру из БД.
  await checkConnection();
  state.loadFrom(await repository.load());
  if (!state.get().item) field.spawnItem();   // самый первый запуск - предмета ещё нет
  await repository.save(state.get(), []);
  // ТРЕБОВАНИЕ 1: HTTP для статики + WebSocket для игры на одном порту.
  const server = http.createServer(staticFiles.serve);
  const wss = new WebSocket.Server({ server });
  router.attach(wss);
  const timers = [sweeper.start(), ping.start()];
  // ДОП. ТРЕБОВАНИЕ 3: Render шлёт SIGTERM при деплое - предупреждаем клиентов, дожидаемся сохранений.
  process.on("SIGTERM", async () => {
    console.log("Получен SIGTERM, останавливаемся...");
    for (const ws of connections.all()) {
      connections.send(ws, { type: "SERVER_SHUTDOWN", reason: "RESTART", retryAfterMs: 5000 });
    }
    timers.forEach(clearInterval);
    await whenIdle();
    wss.close();
    server.close();
    await pool.end();
    process.exit(0);
  });
  server.listen(PORT, () => console.log(`Игра запущена на порту ${PORT}`));
}
start().catch((error) => {
  console.error("Не удалось запустить сервер:", error);
  process.exit(1);
});