import bcrypt from 'bcryptjs';
import { db, ensureSchema, rowToObj } from '../_lib/db.js';
import { signToken } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  await ensureSchema();

  const { email, password } = req.body ?? {};
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const r = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email.trim().toLowerCase()],
  });
  if (!r.rows.length) return res.status(401).json({ error: 'Invalid email or password' });

  const user = rowToObj(r.rows[0], r.columns);
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const token = await signToken({ id: user.id, username: user.username });
  return res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
}
