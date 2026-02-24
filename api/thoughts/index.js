import { db, ensureSchema, rowToObj } from '../_lib/db.js';
import { getUserFromReq } from '../_lib/auth.js';

export default async function handler(req, res) {
  await ensureSchema();

  if (req.method === 'GET') {
    const result = await db.execute(`
      SELECT t.date, t.content, t.created_at, t.updated_at, t.user_id, u.username
      FROM thoughts t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.date DESC
    `);
    return res.json(result.rows.map(r => rowToObj(r, result.columns)));
  }

  if (req.method === 'POST') {
    const { date, content } = req.body ?? {};
    if (!date || !content?.trim()) {
      return res.status(400).json({ error: 'date and content are required' });
    }

    // Attach user_id if logged in
    const authUser = await getUserFromReq(req);
    const userId = authUser?.id ?? null;

    const now = Date.now();
    try {
      await db.execute({
        sql: 'INSERT INTO thoughts (date, content, created_at, updated_at, user_id) VALUES (?, ?, ?, ?, ?)',
        args: [date, content.trim(), now, now, userId],
      });
      const r = await db.execute({
        sql: `SELECT t.date, t.content, t.created_at, t.updated_at, t.user_id, u.username
              FROM thoughts t LEFT JOIN users u ON t.user_id = u.id WHERE t.date = ?`,
        args: [date],
      });
      return res.status(201).json(rowToObj(r.rows[0], r.columns));
    } catch (err) {
      if (err.message?.includes('UNIQUE') || err.message?.includes('PRIMARY KEY')) {
        return res.status(409).json({ error: 'A thought already exists for this date' });
      }
      throw err;
    }
  }

  res.status(405).end();
}
