// Все команды (HELLO, MOVE, SET_NICK, отключение, фоновая уборка) выполняются
// СТРОГО ПО ОЧЕРЕДИ, одна за другой. Пока предыдущая не сохранилась в БД,
// следующая не начнётся. Это и задаёт однозначный порядок: кто первый в очереди -
// тот первый дошёл до предмета. Время с клиента для этого не используется.
let queue = Promise.resolve();
function enqueue(command) {
  queue = queue
    .then(command)
    .catch((error) => console.error("Ошибка игровой команды:", error));
  return queue;
}
// Дождаться, пока очередь опустеет (нужно при остановке сервера)
function whenIdle() {
  return queue;
}
module.exports = { enqueue, whenIdle };