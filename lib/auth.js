import crypto from 'crypto';
import { cookies } from 'next/headers';
const sig = (s) => crypto.createHmac('sha256', process.env.SECRET || 'dev').update(s).digest('hex');
export function makeToken(name, role) { const p = Buffer.from(JSON.stringify({ name, role })).toString('base64url'); return p + '.' + sig(p); }
export function getUser() {
  const t = cookies().get('s')?.value; if (!t) return null;
  const [p, s] = t.split('.'); if (!p || s !== sig(p)) return null;
  try { return JSON.parse(Buffer.from(p, 'base64url').toString()); } catch { return null; }
}
