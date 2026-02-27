import { db, ensureSchema, rowToObj } from '../_lib/db.js';
import { getUserFromReq } from '../_lib/auth.js';

export default async function handler(req, res) {
  await ensureSchema();
  const { username } = req.query;

  // ── GET /api/users/search?q=... ──────────────────────────────────────────────
  // Vercel matches exact filenames before dynamic ones, but search.js was removed
  // to stay within the 12-function Hobby limit; this handler absorbs that route.
  if (username === 'search') {
    if (req.method !== 'GET') return res.status(405).end();
    const q = (req.query.q ?? '').trim();
    const authUser = await getUserFromReq(req);
    const viewerId = authUser?.id ?? null;

    const sql = q
      ? `SELECT u.username, u.bio,
           (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followerCount,
           (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = u.id) AS isFollowing
         FROM users u
         WHERE LOWER(u.username) LIKE LOWER('%' || ? || '%')
         ORDER BY followerCount DESC, u.created_at DESC
         LIMIT 10`
      : `SELECT u.username, u.bio,
           (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followerCount,
           (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = u.id) AS isFollowing
         FROM users u
         ORDER BY followerCount DESC, u.created_at DESC
         LIMIT 10`;

    const args = q ? [viewerId, q] : [viewerId];
    const result = await db.execute({ sql, args });
    const users = result.rows.map(row => {
      const obj = rowToObj(row, result.columns);
      return {
        username: obj.username,
        bio: obj.bio ?? null,
        followerCount: Number(obj.followerCount),
        isFollowing: Boolean(Number(obj.isFollowing)),
      };
    });
    return res.json(users);
  }

  // ── GET /api/users/:username ─────────────────────────────────────────────────
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

  // ── PUT /api/users/:username ─────────────────────────────────────────────────
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
