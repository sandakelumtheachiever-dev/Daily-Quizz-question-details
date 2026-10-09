import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUser, makeToken } from '@/lib/auth';
import { gem, getModel, listModels } from '@/lib/gemini';
const nm = t => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const key = r => nm(r.topic) || `o${r.old_paper}-${r.q_no}`;
const rowsIn = (sql, lo, hi) => sql`select x.new_paper, x.new_q, x.old_paper, x.q_no, q.topic, q.lesson from used x left join questions q on q.old_paper=x.old_paper and q.q_no=x.q_no where x.new_paper between ${lo} and ${hi} order by x.new_paper, x.new_q nulls last, x.id`;
const LESSONS = ['Lesson 1', 'Lesson 2', 'NS', 'LG', 'OS', 'Networking', 'System', 'Database', 'Python', 'Web', 'IOT', 'E-commerce', 'New trends'];
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
  const log = (act, d) => sql`insert into activity(who,role,act,detail) values(${u.name},${u.role},${act},${d})`;
  try {
    if (a === 'check') {
      const q = await sql`select * from questions where old_paper=${b.old_paper} and q_no=${b.q_no}`;
      const used = await sql`select new_paper,new_q from used where old_paper=${b.old_paper} and q_no=${b.q_no} order by new_paper`;
      return ok({ question: q[0] || null, used });
    }
    if (a === 'mark') {
      if (!(b.old_paper > 0) || !(b.new_paper > 0)) return err('Please fill all numbers');
      if (!(b.q_no >= 1 && b.q_no <= 10) || (b.new_q && !(b.new_q >= 1 && b.new_q <= 10))) return err('Question number must be 1 to 10');
      const sl = b.new_q ? await sql`select id,old_paper,q_no,new_paper,new_q,"by" from used where new_paper=${b.new_paper} and new_q=${b.new_q} and id <> ${b.id || 0} order by id` : [];
      if (sl.length) return ok({ conflict: true, kind: 's', existing: sl });
      const ex = await sql`select id,old_paper,q_no,new_paper,new_q,"by" from used where old_paper=${b.old_paper} and q_no=${b.q_no} and id <> ${b.id || 0} order by id`;
      if (ex.length) return ok({ conflict: true, kind: 'q', existing: ex });
      const nw = `2026 Quiz ${b.old_paper} Que ${b.q_no} → 2027 Quiz ${b.new_paper} Que ${b.new_q || '-'}`;
      if (b.id) {
        const o = (await sql`select * from used where id=${b.id}`)[0];
        await sql`update used set old_paper=${b.old_paper}, q_no=${b.q_no}, new_paper=${b.new_paper}, new_q=${b.new_q || null} where id=${b.id} and ("by"=${u.name} or ${u.role === 'admin'})`;
        await log('Edited marked entry', `${o ? `was 2026 Quiz ${o.old_paper} Que ${o.q_no} → 2027 Quiz ${o.new_paper} Que ${o.new_q || '-'} ; now ` : ''}${nw}`); return ok({ status: 'updated' }); }
      await sql`insert into used(old_paper,q_no,new_paper,new_q,"by") values(${b.old_paper},${b.q_no},${b.new_paper},${b.new_q || null},${u.name})`; await log('Marked taken', nw); return ok({ status: 'saved' });
    }
    if (a === 'mymarks') return ok({ rows: await sql`select id,old_paper,q_no,new_paper,new_q from used where "by"=${u.name} order by id desc limit 5` });
    if (a === 'report') {
      if (!(b.existing_id > 0) || !(b.new_paper > 0)) return err('Missing numbers');
      await sql`insert into reports(old_paper,q_no,existing_id,p_paper,p_q,reported_by,kind) values(${b.old_paper},${b.q_no},${b.existing_id},${b.new_paper},${b.new_q || null},${u.name},${b.kind === 's' ? 's' : 'q'})`; await log('Reported duplicate', `2026 Quiz ${b.old_paper} Que ${b.q_no} → 2027 Quiz ${b.new_paper} Que ${b.new_q || '-'}`); return ok();
    }
    if (a === 'unmark') { const o = (await sql`select * from used where id=${b.id}`)[0]; if (o) await log('Deleted marked entry', `2026 Quiz ${o.old_paper} Que ${o.q_no} → 2027 Quiz ${o.new_paper} Que ${o.new_q || '-'} (entered by ${o.by})`); await sql`delete from used where id=${b.id} and ("by"=${u.name} or ${u.role === 'admin'})`; return ok(); }
    if (a === 'add') {
      if (!(b.old_paper > 0) || !(b.q_no >= 1 && b.q_no <= 10) || !(b.topic || '').trim() || !b.lesson) return err('Please fill all inputs');
      const prev = await sql`select topic,added_by from questions where old_paper=${b.old_paper} and q_no=${b.q_no}`;
      await sql`insert into questions(old_paper,q_no,topic,lesson,flagged,added_by) values(${b.old_paper},${b.q_no},${b.topic.trim()},${b.lesson},${!!b.bad},${u.name})
        on conflict(old_paper,q_no) do update set topic=excluded.topic, lesson=excluded.lesson, added_by=excluded.added_by, updated_at=now(), flagged=questions.flagged or excluded.flagged`;
      await log(prev.length ? 'Updated topic' : 'Added topic', `2026 Quiz ${b.old_paper} Que ${b.q_no} [${b.lesson}] ${b.topic.trim()}${b.bad ? ' (flagged as bad)' : ''}`);
      return ok({ status: prev.length ? 'updated' : 'saved' });
    }
    if (a === 'mine') return ok({ rows: await sql`select old_paper,q_no,topic,lesson,flagged,tag,refined_by from questions where added_by=${u.name} order by updated_at desc limit 5` });
    if (a === 'search') {
      const q = (b.topic || '').trim().toLowerCase(); if (!q && !b.lesson) return ok({ same: [], near: [], taken: [] });
      if (!q) {
        const all = await sql`select q.*, coalesce((select json_agg(json_build_object('p',new_paper,'q',new_q)) from used x where x.old_paper=q.old_paper and x.q_no=q.q_no),'[]') as used from questions q where lesson=${b.lesson} order by old_paper,q_no limit 500`;
        return ok({ same: all.filter(r => !r.used.length), near: [], taken: all.filter(r => r.used.length) });
      }
      let kws = q.split(/\s+/).filter(w => w.length > 2);
      try { const k = await gem(`Exam topic: "${q}". Return JSON {"keywords":[up to 12 short lowercase keywords/synonyms/abbreviations a similar quiz topic might contain]}`); kws = [...new Set([...kws, ...k.keywords.map(x => String(x).toLowerCase())])]; } catch (e) {}
      const rows = await sql.query(`select q.*, coalesce((select json_agg(json_build_object('p',new_paper,'q',new_q)) from used x where x.old_paper=q.old_paper and x.q_no=q.q_no),'[]') as used from questions q where lower(topic) like any($1) and ($2::text is null or lesson=$2) limit 200`, [kws.map(k => `%${k}%`), b.lesson || null]);
      let same = new Set();
      if (rows.length) try { const r = await gem(`User wants questions on: "${q}". Candidates: ${JSON.stringify(rows.map((r, i) => [i, r.topic]))}. Return JSON {"same":[indexes of candidates that are essentially the SAME topic]}`); same = new Set(r.same); } catch (e) { rows.forEach((r, i) => r.topic.toLowerCase().includes(q) && same.add(i)); }
      const sc = r => kws.filter(k => r.topic.toLowerCase().includes(k)).length;
      const free = [], taken = [];
      rows.map((r, i) => ({ ...r, same: same.has(i), score: sc(r) })).sort((x, y) => y.same - x.same || y.score - x.score).forEach(r => (r.used.length ? taken : free).push(r));
      return ok({ same: free.filter(r => r.same), near: free.filter(r => !r.same), taken });
    }
    if (a === 'models') return ok({ models: await listModels(), current: await getModel() });
    if (a === 'setmodel') { await sql`insert into settings(k,v) values('model',${b.model}) on conflict(k) do update set v=excluded.v`; return ok(); }
    const rowsOf = p => sql`select u.new_q,u.old_paper,u.q_no,q.topic,q.lesson,q.flagged,q.tag,q.refined_by from used u left join questions q on q.old_paper=u.old_paper and q.q_no=u.q_no where u.new_paper=${p} order by u.new_q nulls last, u.id`;
    if (a === 'paper') return ok({ rows: await rowsOf(b.paper) });
    if (a === 'recent') {
      const ps = await sql`select new_paper from used group by new_paper order by max(id) desc limit 3`;
      return ok({ papers: await Promise.all(ps.map(async x => ({ paper: x.new_paper, rows: await rowsOf(x.new_paper) }))) });
    }
    if (a === 'compare') {
      const tot = await sql`select count(*)::int as c from used where new_paper=${b.paper}`;
      const rr = await sql`select a.new_q, a.old_paper, a.q_no, q.topic, q.lesson, b.new_paper as bp, b.new_q as bq from used a join used b on b.old_paper=a.old_paper and b.q_no=a.q_no and b.new_paper<a.new_paper and b.new_paper>=a.new_paper-45 left join questions q on q.old_paper=a.old_paper and q.q_no=a.q_no where a.new_paper=${b.paper} order by a.new_q nulls last, b.new_paper desc`;
      const g = new Map();
      rr.forEach(r => { const k = r.old_paper + '-' + r.q_no; if (!g.has(k)) g.set(k, { new_q: r.new_q, old_paper: r.old_paper, q_no: r.q_no, topic: r.topic, lesson: r.lesson, hits: [] }); g.get(k).hits.push({ paper: r.bp, q: r.bq, gap: b.paper - r.bp }); });
      return ok({ total: tot[0].c, rows: [...g.values()] });
    }
    if (a === 'logs') return ok({ rows: await sql`select * from activity order by id desc limit 300` });
    if (a === 'flag') {
      const x = await sql`update questions set flagged=true where old_paper=${b.old_paper} and q_no=${b.q_no} returning topic`;
      if (!x.length) return err('Question not found');
      await log('Reported bad question', `2026 Quiz ${b.old_paper} Que ${b.q_no}: ${x[0].topic}`); return ok();
    }
    if (a === 'refined') return ok({ rows: await sql`select old_paper,q_no,topic,lesson,refined_by from questions where refined_by is not null and tag is null and not flagged order by updated_at desc` });
    if (a === 'anchor') {
      const m = Object.fromEntries((await sql`select k,v from settings where k in ('anchor_paper','anchor_date')`).map(r => [r.k, r.v]));
      return ok({ paper: parseInt(m.anchor_paper || 346), date: m.anchor_date || '2026-10-08' });
    }
    if (u.role !== 'admin') return err('Admins only', 403);
    if (a === 'setanchor') {
      if (!(b.paper > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) return err('Enter a quiz number and a date');
      await sql`insert into settings(k,v) values('anchor_paper',${String(b.paper)}) on conflict(k) do update set v=excluded.v`;
      await sql`insert into settings(k,v) values('anchor_date',${b.date}) on conflict(k) do update set v=excluded.v`; return ok();
    }
    if (a === 'import') {
      const m = new Map();
      for (const r of b.rows || []) { const o = parseInt(r.old_paper), q = parseInt(r.q_no), t = String(r.topic || '').trim();
        if (o > 0 && q >= 1 && q <= 10 && t && LESSONS.includes(r.lesson)) m.set(o + '-' + q, [o, q, t, r.lesson]); }
      const v = [...m.values()]; if (!v.length) return ok({ inserted: 0, updated: 0, skipped: 0 });
      const res = await sql.query(`insert into questions(old_paper,q_no,topic,lesson,added_by) select a,b,c,d,$5::text from unnest($1::int[],$2::int[],$3::text[],$4::text[]) as t(a,b,c,d) on conflict(old_paper,q_no) do ${b.overwrite ? 'update set topic=excluded.topic, lesson=excluded.lesson, updated_at=now()' : 'nothing'} returning (xmax = 0) as ins`,
        [v.map(x => x[0]), v.map(x => x[1]), v.map(x => x[2]), v.map(x => x[3]), u.name]);
      const ins = res.filter(x => x.ins).length; await log('Imported topics', `${ins} new, ${res.length - ins} updated, ${v.length - res.length} skipped`); return ok({ inserted: ins, updated: res.length - ins, skipped: v.length - res.length });
    }
    if (a === 'refine') {
      if (!(b.by || '').trim() || !/\.docx?$/i.test(b.fname || '') || !b.b64 || b.b64.length > 4.2e6) return err('Enter the name and a Word file under 3 MB');
      await sql`insert into files(old_paper,q_no,fname,b64) values(${b.old_paper},${b.q_no},${b.fname},${b.b64}) on conflict(old_paper,q_no) do update set fname=excluded.fname, b64=excluded.b64`;
      await sql`update questions set refined_by=${b.by.trim()}, tag=null, flagged=false, updated_at=now() where old_paper=${b.old_paper} and q_no=${b.q_no}`;
      await log('Marked refined', `2026 Quiz ${b.old_paper} Que ${b.q_no} refined by ${b.by.trim()} (${b.fname})`); return ok();
    }
    if (a === 'reports') return ok({ rows: await sql`select r.*, x.new_paper as e_paper, x.new_q as e_q, x.old_paper as e_old, x.q_no as e_qno, x."by" as e_by from reports r left join used x on x.id=r.existing_id where not r.done order by r.id` });
    if (a === 'resolve') {
      const r = (await sql`select * from reports where id=${b.id}`)[0]; if (!r) return err('Not found');
      if (b.keep === 'b' && r.kind === 's') {
        const up = await sql`update used set old_paper=${r.old_paper}, q_no=${r.q_no}, "by"=${r.reported_by} where id=${r.existing_id} returning id`;
        if (!up.length) await sql`insert into used(old_paper,q_no,new_paper,new_q,"by") values(${r.old_paper},${r.q_no},${r.p_paper},${r.p_q},${r.reported_by})`;
      } else if (b.keep === 'b') {
        const up = await sql`update used set new_paper=${r.p_paper}, new_q=${r.p_q}, "by"=${r.reported_by} where id=${r.existing_id} returning id`;
        if (!up.length) await sql`insert into used(old_paper,q_no,new_paper,new_q,"by") values(${r.old_paper},${r.q_no},${r.p_paper},${r.p_q},${r.reported_by})`;
      }
      await sql`update reports set done=true where id=${b.id}`; await log('Resolved duplicate report', `kept ${b.keep === 'b' ? 'B (reported)' : 'A (saved)'} for 2026 Quiz ${r.old_paper} Que ${r.q_no}`); return ok();
    }
    if (a === 'queue') return ok({ rows: await sql`select * from questions where flagged and tag is null order by old_paper,q_no` });
    if (a === 'tag') { await log(b.tag ? 'Tagged question' : 'Dismissed bad-question report', `2026 Quiz ${b.old_paper} Que ${b.q_no}${b.tag ? ': ' + b.tag : ''}`); await sql`update questions set tag=${b.tag || null}, flagged=false where old_paper=${b.old_paper} and q_no=${b.q_no}`; return ok(); }
  } catch (e) { return err(e.message, 500); }
  return err('Unknown action', 404);
}

export async function GET(req, { params }) {
  if (!getUser()) return new Response('Login required', { status: 401 });
  if (params.action !== 'file') return new Response('Not found', { status: 404 });
  const sp = new URL(req.url).searchParams, sql = await db();
  const r = await sql`select fname,b64 from files where old_paper=${parseInt(sp.get('old_paper'))} and q_no=${parseInt(sp.get('q_no'))}`;
  if (!r[0]) return new Response('No file', { status: 404 });
  return new Response(Buffer.from(r[0].b64, 'base64'), { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${r[0].fname.replace(/[^\w.\- ]/g, '_')}"` } });
}
