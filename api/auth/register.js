import bcrypt from 'bcryptjs';
import { db, ensureSchema } from '../_lib/db.js';
import { signToken } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  await ensureSchema();

  const { username, email, password } = req.body ?? {};
  if (!username?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'username, email, and password are required' });
  }
  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
    return res.status(400).json({ error: 'Username may only contain letters, numbers, underscores, and hyphens' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();
  const password_hash = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();

  try {
    await db.execute({
      sql: 'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)',
      args: [id, cleanUsername, cleanEmail, password_hash],
    });
    const token = await signToken({ id, username: cleanUsername });
    return res.status(201).json({ token, user: { id, username: cleanUsername, email: cleanEmail } });
  } catch (err) {
    if (err.message?.includes('UNIQUE') || err.message?.includes('unique')) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }
    throw err;
  }
}
