// Токен сессии в localStorage: по нему сервер узнаёт игрока после перезагрузки.
const KEY = "gameToken";

export const session = {
  getToken: () => localStorage.getItem(KEY),
  saveToken: (token) => localStorage.setItem(KEY, token),
  clear: () => localStorage.removeItem(KEY),
};
