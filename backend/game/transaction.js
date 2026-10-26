// изм память - сохр в БД - при ошибке откат
const state = require("./state");
const repository = require("../db/gameRepository");
async function commitOrRollback(backup, scoreEntries = []) {
  try {
    await repository.save(state.get(), scoreEntries);
  } catch (error) {
    state.restore(backup);
    throw error;
  }
}
module.exports = { commitOrRollback };