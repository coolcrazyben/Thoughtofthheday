# Thought of the Day

A warm, minimal journaling web app. Write one thought per day, revisit your archive, and get a daily push notification reminder.

**Stack:** React + Vite · Vercel serverless functions · Turso (SQLite cloud) · Web Push API

---

## Project structure

```
├── api/                        Vercel serverless functions
│   ├── _lib/
│   │   ├── db.js               Turso/libsql client + schema init
│   │   └── push.js             web-push VAPID setup
│   ├── thoughts/
│   │   ├── index.js            GET /api/thoughts, POST /api/thoughts
│   │   └── [date].js           GET/PUT/DELETE /api/thoughts/:date
│   ├── vapid-key.js            GET /api/vapid-key
│   ├── subscribe.js            POST/DELETE /api/subscribe
│   └── send-notification.js   POST /api/send-notification
├── src/                        React frontend
│   ├── views/TodayView.jsx
│   ├── views/ArchiveView.jsx
│   └── components/NavBar.jsx  (includes notification settings panel)
├── public/sw.js                Service worker (push + offline cache)
├── vercel.json
└── vite.config.js
```

---

## Deploy to Vercel

### 1. Set up Turso (free SQLite cloud database)

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create a database
turso db create thoughtoftheday

# Get connection info
turso db show thoughtoftheday --url      # → TURSO_DATABASE_URL
turso db tokens create thoughtoftheday   # → TURSO_AUTH_TOKEN
```

### 2. Generate VAPID keys for push notifications

```bash
npx web-push generate-vapid-keys
```

### 3. Add environment variables in Vercel

In your Vercel project → **Settings → Environment Variables**:

| Key | Value |
|-----|-------|
| `TURSO_DATABASE_URL` | libsql URL from step 1 |
| `TURSO_AUTH_TOKEN` | auth token from step 1 |
| `VAPID_PUBLIC_KEY` | from step 2 |
| `VAPID_PRIVATE_KEY` | from step 2 |
| `VAPID_EMAIL` | your email address |

### 4. Deploy

Connect the GitHub repo in Vercel — it deploys automatically on every push to `main`.

---

## Local development

```bash
npm install

# Copy env template (leave Turso fields blank to use ./data/local.db automatically)
cp .env.example .env.local

# Option A — Vercel CLI (recommended: runs API routes + Vite together)
npm install -g vercel
npm run dev        # → http://localhost:3000

# Option B — Vite standalone (API routes unavailable without the CLI)
npx vite           # → http://localhost:5173
```

---

## REST API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/thoughts` | All thoughts, newest first |
| `GET` | `/api/thoughts/:date` | Single thought (`YYYY-MM-DD`) |
| `POST` | `/api/thoughts` | Create — body: `{ date, content }` |
| `PUT` | `/api/thoughts/:date` | Update — body: `{ content }` |
| `DELETE` | `/api/thoughts/:date` | Remove |
| `GET` | `/api/vapid-key` | Returns `{ publicKey }` |
| `POST` | `/api/subscribe` | Save push subscription — `{ subscription, notifyTime }` |
| `DELETE` | `/api/subscribe` | Remove subscription — `{ endpoint }` |
| `POST` | `/api/send-notification` | Trigger push to all subscribers — `{ title?, body? }` |

---

## Push notifications

### Vercel Cron (Pro plan, $20/mo)

`vercel.json` includes a cron job pointing to `POST /api/send-notification`. Edit the `schedule` field (UTC cron syntax) to your preferred time:

```json
"crons": [{ "path": "/api/send-notification", "schedule": "0 14 * * *" }]
```
`0 14 * * *` = 14:00 UTC = 9 AM EST.

### Free alternative: external cron

Use [cron-job.org](https://cron-job.org) (free) to call your endpoint on a schedule:

```
POST https://your-app.vercel.app/api/send-notification
Content-Type: application/json
{"title":"Thought of the Day","body":"Time to write ✍️"}
```

---

## Push notification icon

Add a 192×192 PNG at `public/icon-192.png` to display an icon in notifications.
