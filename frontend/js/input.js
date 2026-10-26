const DIRECTIONS = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
};
const REPEAT_MS = 140;

// Превращает клавиши и экранные кнопки в вызовы onMove("up" | "down" | "left" | "right").
// Пока клавиша зажата, шаг повторяется.
export function setupInput(onMove) {
  let timer = null;
  let heldCode = null;

  function start(direction) {
    clearInterval(timer);
    onMove(direction);
    timer = setInterval(() => onMove(direction), REPEAT_MS);
  }

  function stop() {
    clearInterval(timer);
    heldCode = null;
  }

  document.addEventListener("keydown", (event) => {
    const direction = DIRECTIONS[event.code];
    // В поле ввода ника буквы должны печататься.
    if (!direction || event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    if (event.repeat) return; // повтор делает наш таймер
    heldCode = event.code;
    start(direction);
  });

  document.addEventListener("keyup", (event) => {
    if (event.code === heldCode) stop();
  });

  window.addEventListener("blur", stop);

  for (const button of document.querySelectorAll("[data-direction]")) {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      start(button.dataset.direction);
    });
    for (const name of ["pointerup", "pointerleave", "pointercancel"]) {
      button.addEventListener(name, stop);
    }
  }
}
