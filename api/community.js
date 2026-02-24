import { db, ensureSchema, rowToObj } from './_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await ensureSchema();

  const r = await db.execute(`
    SELECT t.date, t.content, t.created_at, t.updated_at, t.user_id, u.username
    FROM thoughts t
    LEFT JOIN users u ON t.user_id = u.id
    ORDER BY t.date DESC
    LIMIT 100
  `);
  return res.json(r.rows.map(row => rowToObj(row, r.columns)));
}
