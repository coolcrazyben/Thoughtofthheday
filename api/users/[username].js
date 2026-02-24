import { db, ensureSchema, rowToObj } from '../_lib/db.js';
import { getUserFromReq } from '../_lib/auth.js';

export default async function handler(req, res) {
  await ensureSchema();
  const { username } = req.query;

  if (req.method === 'GET') {
    const ur = await db.execute({
      sql: 'SELECT id, username, bio, created_at FROM users WHERE username = ?',
      args: [username],
    });
    if (!ur.rows.length) return res.status(404).json({ error: 'User not found' });
    const user = rowToObj(ur.rows[0], ur.columns);

    const tr = await db.execute({
      sql: 'SELECT date, content, created_at, updated_at FROM thoughts WHERE user_id = ? ORDER BY date DESC',
      args: [user.id],
    });
    const thoughts = tr.rows.map(r => rowToObj(r, tr.columns));
    return res.json({ user, thoughts });
  }

  if (req.method === 'PUT') {
    const authUser = await getUserFromReq(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (authUser.username !== username) return res.status(403).json({ error: 'Forbidden' });

    const { bio } = req.body ?? {};
    await db.execute({
      sql: 'UPDATE users SET bio = ? WHERE username = ?',
      args: [bio?.trim() ?? null, username],
    });
    const ur = await db.execute({
      sql: 'SELECT id, username, bio, created_at FROM users WHERE username = ?',
      args: [username],
    });
    return res.json(rowToObj(ur.rows[0], ur.columns));
  }

  res.status(405).end();
}
