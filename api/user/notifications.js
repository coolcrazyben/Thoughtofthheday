import { db, ensureSchema, rowToObj } from '../_lib/db.js';
import { getUserFromReq, verifyToken } from '../_lib/auth.js';

const APP_URL = process.env.APP_URL || 'https://thoughtoftheday.vercel.app';

export default async function handler(req, res) {
  await ensureSchema();

  // ── One-click unsubscribe via email link ─────────────────────────────────────
  // GET /api/user/notifications?unsubscribeToken=<jwt>
  if (req.method === 'GET' && req.query.unsubscribeToken) {
    const payload = await verifyToken(req.query.unsubscribeToken);
    if (!payload || payload.purpose !== 'unsubscribe') {
      return res.status(400).send(`<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>Invalid link</title></head>
        <body style="font-family:sans-serif;padding:2rem;text-align:center;background:#faf8f3;color:#3d3428;">
          <h2>Invalid or expired unsubscribe link</h2>
          <p><a href="${APP_URL}" style="color:#8b6914;">Return to the app</a></p>
        </body></html>`);
    }
    await db.execute({
      sql: 'UPDATE users SET notify_email = 0 WHERE id = ?',
      args: [payload.id],
    });
    return res.status(200).send(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Unsubscribed</title></head>
      <body style="font-family:sans-serif;padding:2rem;text-align:center;background:#faf8f3;color:#3d3428;">
        <p style="font-size:2rem;margin-bottom:1rem;">✦</p>
        <h2 style="font-weight:normal;margin-bottom:0.75rem;">You've been unsubscribed</h2>
        <p style="color:#7a6a57;">You won't receive daily email reminders anymore.<br>
          You can re-enable them any time from your profile settings.</p>
        <p style="margin-top:2rem;">
          <a href="${APP_URL}" style="color:#8b6914;font-weight:600;text-decoration:none;">
            Return to Thought of the Day →
          </a>
        </p>
      </body></html>`);
  }

  // ── GET /api/user/notifications — return current preferences ─────────────────
  if (req.method === 'GET') {
    const authUser = await getUserFromReq(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

    const r = await db.execute({
      sql: 'SELECT notify_email, notify_time, notify_timezone FROM users WHERE id = ?',
      args: [authUser.id],
    });
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    const row = rowToObj(r.rows[0], r.columns);
    return res.json({
      notify_email: Boolean(Number(row.notify_email ?? 1)),
      notify_time: row.notify_time ?? '09:00',
      notify_timezone: row.notify_timezone ?? 'America/Chicago',
    });
  }

  // ── PUT /api/user/notifications — update preferences ─────────────────────────
  if (req.method === 'PUT') {
    const authUser = await getUserFromReq(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

    const { notify_email, notify_time, notify_timezone } = req.body ?? {};
    await db.execute({
      sql: 'UPDATE users SET notify_email = ?, notify_time = ?, notify_timezone = ? WHERE id = ?',
      args: [
        notify_email ? 1 : 0,
        notify_time ?? '09:00',
        notify_timezone ?? 'America/Chicago',
        authUser.id,
      ],
    });
    return res.json({ ok: true });
  }

  res.status(405).end();
}
