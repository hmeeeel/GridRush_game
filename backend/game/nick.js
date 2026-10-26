//  правила для ника
const { NICK_MIN_LENGTH, NICK_MAX_LENGTH } = require("../config");
const state = require("./state");
// Обрезаем пробелы здесь, чтобы обработчики не забывали это делать.
function normalize(raw) {
  return typeof raw === "string" ? raw.trim() : "";
}
function isValid(nick) {
  return nick.length >= NICK_MIN_LENGTH &&
    nick.length <= NICK_MAX_LENGTH &&
    /^[\p{L}\p{N}_-]+$/u.test(nick); //2–16 символов, буквы/цифры/_/-
}
function isTaken(nick, exceptPlayerId = null) {
  const lower = nick.toLocaleLowerCase();
  return Object.values(state.get().players).some(
    (p) => p.id !== exceptPlayerId && p.nick.toLocaleLowerCase() === lower
  );
}
// для входа и смена ника. Возвращает код ошибки или null
function validate(nick, exceptPlayerId = null) {
  if (!isValid(nick)) return "INVALID_NICK";
  if (isTaken(nick, exceptPlayerId)) return "NICK_TAKEN";
  return null;
}
const ERROR_TEXT = {
  INVALID_NICK: "Ник: 2–16 букв, цифр, _ или -",
  NICK_TAKEN: "Этот ник уже занят"
};
module.exports = { normalize, validate, ERROR_TEXT };