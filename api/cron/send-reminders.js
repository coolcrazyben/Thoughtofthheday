import { Resend } from 'resend';
import { db, ensureSchema, rowToObj } from '../_lib/db.js';
import { signToken } from '../_lib/auth.js';

const APP_URL = process.env.APP_URL || 'https://thoughtoftheday.vercel.app';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Thought of the Day <onboarding@resend.dev>';

// Return the current hour (0–23) in the given IANA timezone
function getCurrentHourInTimezone(timezone) {
  try {
    const str = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    }).format(new Date());
    const h = parseInt(str, 10);
    return isNaN(h) ? new Date().getUTCHours() : h;
  } catch {
    return new Date().getUTCHours();
  }
}

// Return today's date as YYYY-MM-DD in the given IANA timezone
function getTodayInTimezone(timezone) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function buildEmailHtml(username, unsubscribeUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Have you written your thought today?</title>
</head>
<body style="margin:0;padding:0;background-color:#faf8f3;">
  <div style="max-width:560px;margin:0 auto;padding:48px 32px;font-family:Georgia,'Times New Roman',serif;">

    <p style="margin:0 0 28px;color:#8b6914;font-size:1rem;letter-spacing:0.02em;">
      ✦ Thought of the Day
    </p>

    <h1 style="margin:0 0 20px;font-size:1.65rem;font-weight:normal;color:#3d3428;line-height:1.35;">
      Have you written your thought today?
    </h1>

    <p style="margin:0 0 10px;color:#7a6a57;font-size:1rem;line-height:1.75;">
      Hey ${username},
    </p>
    <p style="margin:0 0 36px;color:#7a6a57;font-size:1rem;line-height:1.75;">
      You haven't posted your thought of the day yet. Don't let today slip by without
      capturing what's on your mind — even a single sentence is enough.
    </p>

    <a href="${APP_URL}"
       style="display:inline-block;background:#8b6914;color:#ffffff;padding:14px 32px;
              border-radius:8px;text-decoration:none;
              font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              font-weight:600;font-size:0.95rem;letter-spacing:0.01em;">
      Write today's thought &rarr;
    </a>

    <hr style="margin:48px 0 24px;border:none;border-top:1px solid #e0d5c5;">

    <p style="margin:0;color:#a89880;font-size:0.78rem;
              font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              line-height:1.6;">
      You're receiving this because you enabled daily email reminders on Thought of the Day.
      <br>
      <a href="${unsubscribeUrl}" style="color:#8b6914;text-decoration:none;">
        Unsubscribe from reminders
      </a>
    </p>

  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Vercel passes Authorization: Bearer <CRON_SECRET> for cron jobs
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }

  await ensureSchema();

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Fetch all users with email reminders enabled
  const usersResult = await db.execute({
    sql: `SELECT id, username, email, notify_time, notify_timezone
          FROM users
          WHERE notify_email = 1`,
    args: [],
  });
  const users = usersResult.rows.map(r => rowToObj(r, usersResult.columns));

  const results = { sent: 0, skipped: 0, errors: 0 };

  for (const user of users) {
    const timezone  = user.notify_timezone || 'America/Chicago';
    const notifyTime = user.notify_time || '09:00';
    const targetHour = parseInt(notifyTime.split(':')[0], 10);
    const currentHour = getCurrentHourInTimezone(timezone);

    // Only send during the user's preferred hour
    if (currentHour !== targetHour) {
      results.skipped++;
      continue;
    }

    // Skip if they've already posted today (in their timezone)
    const today = getTodayInTimezone(timezone);
    const thoughtCheck = await db.execute({
      sql: 'SELECT date FROM thoughts WHERE user_id = ? AND date = ?',
      args: [user.id, today],
    });
    if (thoughtCheck.rows.length > 0) {
      results.skipped++;
      continue;
    }

    // Build a signed unsubscribe token (30-day expiry, inherited from signToken default)
    const unsubscribeToken = await signToken({ id: user.id, purpose: 'unsubscribe' });
    const unsubscribeUrl = `${APP_URL}/api/user/notifications?unsubscribeToken=${unsubscribeToken}`;

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: "Have you written your thought today?",
        html: buildEmailHtml(user.username, unsubscribeUrl),
      });
      results.sent++;
    } catch (err) {
      console.error(`[send-reminders] Failed for ${user.email}:`, err?.message);
      results.errors++;
    }
  }

  return res.json({ ok: true, ...results, total: users.length });
}
