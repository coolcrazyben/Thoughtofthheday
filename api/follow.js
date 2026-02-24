import { db, ensureSchema } from './_lib/db.js';
import { getUserFromReq } from './_lib/auth.js';

export default async function handler(req, res) {
  await ensureSchema();

  if (req.method !== 'POST' && req.method !== 'DELETE') return res.status(405).end();

  const authUser = await getUserFromReq(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  const { username } = req.body ?? {};
  if (!username) return res.status(400).json({ error: 'username is required' });

  // Look up the target user
  const tr = await db.execute({
    sql: 'SELECT id FROM users WHERE username = ?',
    args: [username],
  });
  if (!tr.rows.length) return res.status(404).json({ error: 'User not found' });
  const targetId = tr.rows[0][0];

  if (targetId === authUser.id) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }

  if (req.method === 'POST') {
    try {
      await db.execute({
        sql: 'INSERT INTO follows (id, follower_id, following_id) VALUES (?, ?, ?)',
        args: [crypto.randomUUID(), authUser.id, targetId],
      });
    } catch (err) {
      // Already following — treat as success
      if (!err.message?.includes('UNIQUE') && !err.message?.includes('unique')) throw err;
    }
    return res.status(201).json({ following: true });
  }

  // DELETE
  await db.execute({
    sql: 'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
    args: [authUser.id, targetId],
  });
  return res.json({ following: false });
}
