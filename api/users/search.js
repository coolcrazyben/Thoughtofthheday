import { db, ensureSchema, rowToObj } from '../_lib/db.js';
import { getUserFromReq } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await ensureSchema();

  const q = (req.query.q ?? '').trim();
  const authUser = await getUserFromReq(req);
  // Use null when unauthenticated — SQL `follower_id = NULL` never matches, so isFollowing = 0
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
