import { db, ensureSchema } from '../_lib/db.js';
import { getUserFromReq } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await ensureSchema();

  const { username } = req.query;

  const ur = await db.execute({
    sql: 'SELECT id FROM users WHERE username = ?',
    args: [username],
  });
  if (!ur.rows.length) return res.status(404).json({ error: 'User not found' });
  const userId = ur.rows[0][0];

  const [fcr, fgr] = await Promise.all([
    db.execute({
      sql: 'SELECT COUNT(*) AS count FROM follows WHERE following_id = ?',
      args: [userId],
    }),
    db.execute({
      sql: 'SELECT COUNT(*) AS count FROM follows WHERE follower_id = ?',
      args: [userId],
    }),
  ]);

  const followerCount = Number(fcr.rows[0][0]);
  const followingCount = Number(fgr.rows[0][0]);

  let isFollowing = false;
  const authUser = await getUserFromReq(req);
  if (authUser && authUser.id !== userId) {
    const ifr = await db.execute({
      sql: 'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      args: [authUser.id, userId],
    });
    isFollowing = ifr.rows.length > 0;
  }

  return res.json({ followerCount, followingCount, isFollowing });
}
