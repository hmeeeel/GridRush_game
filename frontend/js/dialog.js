import { $ } from "./dom.js";

const NICK_RULE = /^[\p{L}\p{N}_-]{2,16}$/u;

// Окно ввода ника: нужно и при входе, и при смене ника.
// Главная проверка ника всё равно на сервере, здесь только подсказка игроку.
export class NickDialog {
  constructor(onSubmit) {
    $("nick-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const nick = $("nick-input").value.trim();

      if (!NICK_RULE.test(nick)) {
        this.showError("Ник: 2–16 символов - буквы, цифры, _ и -.");
        return;
      }
      this.showError("");
      onSubmit(nick);
    });

    $("cancel-btn").addEventListener("click", () => this.close());
  }

  open({ title, button, canCancel, error = "" }) {
    $("sheet-title").textContent = title;
    $("submit-btn").textContent = button;
    $("cancel-btn").hidden = !canCancel;
    this.showError(error);
    $("overlay").hidden = false;
    $("nick-input").focus();
  }

  close() {
    $("overlay").hidden = true;
  }

  showError(text) {
    $("nick-error").textContent = text;
  }
}
