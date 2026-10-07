import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUser, makeToken } from '@/lib/auth';
import { gem, getModel, listModels } from '@/lib/gemini';
const ok = (d = {}) => NextResponse.json(d);
const err = (m, s = 400) => NextResponse.json({ error: m }, { status: s });

export async function POST(req, { params }) {
  const a = params.action; const b = await req.json().catch(() => ({}));
  if (a === 'login') {
    const name = (b.name || '').trim();
    const role = b.password === process.env.ADMIN_PASSWORD ? 'admin' : b.password === process.env.USER_PASSWORD ? 'user' : null;
    if (!name || !role) return err('Wrong name or password', 401);
    const r = ok({ name, role }); r.cookies.set('s', makeToken(name, role), { httpOnly: true, secure: true, path: '/', maxAge: 2592000 }); return r;
  }
  if (a === 'logout') { const r = ok(); r.cookies.delete('s'); return r; }
  const u = getUser();
  if (a === 'me') return ok({ user: u });
  if (!u) return err('Login required', 401);
  const sql = await db();
  try {
    if (a === 'check') {
      const q = await sql`select * from questions where old_paper=${b.old_paper} and q_no=${b.q_no}`;
      const used = await sql`select new_paper,new_q from used where old_paper=${b.old_paper} and q_no=${b.q_no} order by new_paper`;
      return ok({ question: q[0] || null, used });
    }
    if (a === 'mark') {
      await sql`insert into used(old_paper,q_no,new_paper,new_q,by) values(${b.old_paper},${b.q_no},${b.new_paper},${b.new_q || null},${u.name})`; return ok();
    }
    if (a === 'add') {
      await sql`insert into questions(old_paper,q_no,topic,flagged,added_by) values(${b.old_paper},${b.q_no},${b.topic},${!!b.bad},${u.name})
        on conflict(old_paper,q_no) do update set topic=excluded.topic, flagged=questions.flagged or excluded.flagged`; return ok();
    }
    if (a === 'search') {
      const q = (b.topic || '').trim().toLowerCase(); if (!q) return ok({ same: [], near: [], taken: [] });
      let kws = q.split(/\s+/).filter(w => w.length > 2);
      try { const k = await gem(`Exam topic: "${q}". Return JSON {"keywords":[up to 12 short lowercase keywords/synonyms/abbreviations a similar quiz topic might contain]}`); kws = [...new Set([...kws, ...k.keywords.map(x => String(x).toLowerCase())])]; } catch (e) {}
      const rows = await sql.query(`select q.*, coalesce((select json_agg(json_build_object('p',new_paper,'q',new_q)) from used x where x.old_paper=q.old_paper and x.q_no=q.q_no),'[]') as used from questions q where lower(topic) like any($1) limit 200`, [kws.map(k => `%${k}%`)]);
      let same = new Set();
      if (rows.length) try { const r = await gem(`User wants questions on: "${q}". Candidates: ${JSON.stringify(rows.map((r, i) => [i, r.topic]))}. Return JSON {"same":[indexes of candidates that are essentially the SAME topic]}`); same = new Set(r.same); } catch (e) { rows.forEach((r, i) => r.topic.toLowerCase().includes(q) && same.add(i)); }
      const sc = r => kws.filter(k => r.topic.toLowerCase().includes(k)).length;
      const free = [], taken = [];
      rows.map((r, i) => ({ ...r, same: same.has(i), score: sc(r) })).sort((x, y) => y.same - x.same || y.score - x.score).forEach(r => (r.used.length ? taken : free).push(r));
      return ok({ same: free.filter(r => r.same), near: free.filter(r => !r.same), taken });
    }
    if (a === 'models') return ok({ models: await listModels(), current: await getModel() });
    if (a === 'setmodel') { await sql`insert into settings(k,v) values('model',${b.model}) on conflict(k) do update set v=excluded.v`; return ok(); }
    if (u.role !== 'admin') return err('Admins only', 403);
    if (a === 'queue') return ok({ rows: await sql`select * from questions where flagged and tag is null order by old_paper,q_no` });
    if (a === 'tag') { await sql`update questions set tag=${b.tag || null}, flagged=false where old_paper=${b.old_paper} and q_no=${b.q_no}`; return ok(); }
  } catch (e) { return err(e.message, 500); }
  return err('Unknown action', 404);
}
