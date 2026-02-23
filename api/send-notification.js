import { db, ensureSchema } from './_lib/db.js';
import { getPush } from './_lib/push.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  await ensureSchema();
  const push = getPush();
  if (!push) return res.status(503).json({ error: 'Push not configured (missing VAPID keys)' });

  const {
    title = 'Thought of the Day',
    body  = "Time to write today's thought ✍️",
  } = req.body ?? {};

  const subs = await db.execute('SELECT endpoint, p256dh, auth FROM subscriptions');
  if (!subs.rows.length) return res.json({ sent: 0, total: 0 });

  const results = await Promise.allSettled(
    subs.rows.map(sub =>
      push.sendNotification(
        { endpoint: sub[0], keys: { p256dh: sub[1], auth: sub[2] } },
        JSON.stringify({ title, body })
      )
    )
  );

  // Prune dead subscriptions (410 Gone / 404)
  await Promise.all(
    results.map((r, i) => {
      if (r.status === 'rejected' && [404, 410].includes(r.reason?.statusCode)) {
        return db.execute({
          sql: 'DELETE FROM subscriptions WHERE endpoint = ?',
          args: [subs.rows[i][0]],
        });
      }
    }).filter(Boolean)
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  res.json({ sent, total: subs.rows.length });
}
