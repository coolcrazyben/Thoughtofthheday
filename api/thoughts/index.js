import { db, ensureSchema, rowToObj } from '../_lib/db.js';

export default async function handler(req, res) {
  await ensureSchema();

  if (req.method === 'GET') {
    const result = await db.execute('SELECT * FROM thoughts ORDER BY date DESC');
    return res.json(result.rows.map(r => rowToObj(r, result.columns)));
  }

  if (req.method === 'POST') {
    const { date, content } = req.body ?? {};
    if (!date || !content?.trim()) {
      return res.status(400).json({ error: 'date and content are required' });
    }
    const now = Date.now();
    try {
      await db.execute({
        sql: 'INSERT INTO thoughts (date, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
        args: [date, content.trim(), now, now],
      });
      const r = await db.execute({ sql: 'SELECT * FROM thoughts WHERE date = ?', args: [date] });
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
