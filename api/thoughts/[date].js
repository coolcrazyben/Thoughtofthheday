import { db, ensureSchema, rowToObj } from '../_lib/db.js';

export default async function handler(req, res) {
  await ensureSchema();
  const { date } = req.query;

  if (req.method === 'GET') {
    const r = await db.execute({
      sql: `SELECT t.date, t.content, t.created_at, t.updated_at, t.user_id, u.username
            FROM thoughts t LEFT JOIN users u ON t.user_id = u.id WHERE t.date = ?`,
      args: [date],
    });
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    return res.json(rowToObj(r.rows[0], r.columns));
  }

  if (req.method === 'PUT') {
    const { content } = req.body ?? {};
    if (!content?.trim()) return res.status(400).json({ error: 'content is required' });
    const now = Date.now();
    const upd = await db.execute({
      sql: 'UPDATE thoughts SET content = ?, updated_at = ? WHERE date = ?',
      args: [content.trim(), now, date],
    });
    if (upd.rowsAffected === 0) return res.status(404).json({ error: 'Not found' });
    const r = await db.execute({
      sql: `SELECT t.date, t.content, t.created_at, t.updated_at, t.user_id, u.username
            FROM thoughts t LEFT JOIN users u ON t.user_id = u.id WHERE t.date = ?`,
      args: [date],
    });
    return res.json(rowToObj(r.rows[0], r.columns));
  }

  if (req.method === 'DELETE') {
    const del = await db.execute({ sql: 'DELETE FROM thoughts WHERE date = ?', args: [date] });
    if (del.rowsAffected === 0) return res.status(404).json({ error: 'Not found' });
    return res.status(204).end();
  }

  res.status(405).end();
}
