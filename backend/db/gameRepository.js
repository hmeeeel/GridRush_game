//  сохранение данных между запусками.
const { pool } = require("./pool");

// Загрузить всё, что было сохранено
async function load() {
  const db = await pool.connect();
  try {
    // Единственная строка глобального состояния. Создаём, если её ещё нет (первый запуск).
    await db.query("insert into public.game_state (id) values (1) on conflict (id) do nothing");
    const stateResult = await db.query("select * from public.game_state where id = 1");
    const playersResult = await db.query("select * from public.players");
    const row = stateResult.rows[0];
    return {
      stateVersion: Number(row.state_version),
      totalItemsCollected: Number(row.total_items_collected),
      schemaVersion: row.schema_version,
      item: row.item,
      players: playersResult.rows.map(rowToPlayer)
    };
  } finally {
    db.release();
  }
}
// Сохранить состояние целиком + новые записи в журнал очков
async function save(game, scoreEntries) {
  const db = await pool.connect();
  try {
    await db.query("begin");
    await db.query(
      `update public.game_state
         set state_version = $1, total_items_collected = $2,
             schema_version = $3, item = $4::jsonb, updated_at = now()
       where id = 1`,
      [game.stateVersion, game.totalItemsCollected, game.schemaVersion, JSON.stringify(game.item)]
    );
    for (const p of Object.values(game.players)) {
      await db.query(
        `insert into public.players
           (id, token_hash, nick, color, score, x, y, on_field, created_at, last_seen_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         on conflict (id) do update set
           token_hash = excluded.token_hash, nick = excluded.nick, color = excluded.color,
           score = excluded.score, x = excluded.x, y = excluded.y,
           on_field = excluded.on_field, last_seen_at = excluded.last_seen_at`,
        [p.id, p.token_hash, p.nick, p.color, p.score, p.x, p.y, p.on_field, p.created_at, p.last_seen_at]
      );
    }

    for (const entry of scoreEntries) {
      await db.query(
        `insert into public.score_log (player_id, item_id, x, y)
         values ($1, $2, $3, $4) on conflict (item_id) do nothing`,
        [entry.playerId, entry.itemId, entry.x, entry.y]
      );
    }
    await db.query("commit");
  } catch (error) {
    await db.query("rollback").catch(() => {});
    throw error;
  } finally {
    db.release();
  }
}
function rowToPlayer(row) {
  return {
    id: row.id,
    token_hash: row.token_hash,
    nick: row.nick,
    color: row.color,
    score: row.score,
    x: row.x,
    y: row.y,
    on_field: row.on_field,
    created_at: row.created_at,
    last_seen_at: row.last_seen_at
  };
}
module.exports = { load, save };