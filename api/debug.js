export default async function handler(_req, res) {
  try {
    const { db, ensureSchema } = await import('./_lib/db.js');
    await ensureSchema();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack?.split('\n').slice(0, 5) });
  }
}
