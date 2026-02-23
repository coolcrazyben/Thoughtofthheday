import { db, ensureSchema } from './_lib/db.js';

export default async function handler(req, res) {
  await ensureSchema();

  if (req.method === 'POST') {
    const { subscription, notifyTime = '09:00' } = req.body ?? {};
    const endpoint = subscription?.endpoint;
    const p256dh   = subscription?.keys?.p256dh;
    const auth     = subscription?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    await db.execute({
      sql: `INSERT INTO subscriptions (endpoint, p256dh, auth, notify_time, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(endpoint) DO UPDATE SET
              p256dh      = excluded.p256dh,
              auth        = excluded.auth,
              notify_time = excluded.notify_time`,
      args: [endpoint, p256dh, auth, notifyTime, Date.now()],
    });
    return res.status(201).json({ message: 'Subscribed' });
  }

  if (req.method === 'DELETE') {
    const { endpoint } = req.body ?? {};
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
    await db.execute({ sql: 'DELETE FROM subscriptions WHERE endpoint = ?', args: [endpoint] });
    return res.status(204).end();
  }

  res.status(405).end();
}
