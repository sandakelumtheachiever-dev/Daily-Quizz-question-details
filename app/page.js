'use client';
import { useState, useEffect } from 'react';
const api = async (a, b = {}) => { const r = await fetch('/api/' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return { ok: r.ok, ...(await r.json()) }; };
let A = { paper: 346, date: '2026-10-08' };
const dd = n => { const [y, m, d] = A.date.split('-').map(Number), t = new Date(); return Math.round((Date.UTC(y, m - 1, d) + (n - A.paper) * 864e5 - Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())) / 864e5); };
const dm = n => {
  const [y, m, d] = A.date.split('-').map(Number), t = new Date();
  const dt = Date.UTC(y, m - 1, d) + (n - A.paper) * 864e5, td = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
  const diff = Math.round((dt - td) / 864e5);
  const rel = diff === 0 ? 'today' : diff < 0 ? `${-diff} day${diff === -1 ? '' : 's'} ago` : `in ${diff} day${diff === 1 ? '' : 's'}`;
  return <>{new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })} · <span className={diff > -60 ? 'hl' : ''}>{rel}</span></>;
};
const n = v => parseInt(v);
function In({ v, set, ph, tried, num, style, onEnter }) {
  const empty = !String(v).trim(), badNum = num && !empty && !(n(v) > 0);
  const e = tried && (empty || badNum);
  return <span style={{ display: 'inline-block', verticalAlign: 'top', ...style }}>
    <input style={{ width: '100%' }} className={e ? 'invalid' : ''} placeholder={ph} value={v} onChange={x => set(x.target.value)} onKeyDown={x => x.key === 'Enter' && onEnter && onEnter()} />
    {e && <div className="msg">{empty ? 'Please enter ' + ph.toLowerCase() : 'Enter a valid number'}</div>}</span>;
}
const okNum = v => n(v) > 0;


export default function Home() {
  const [user, setUser] = useState(null), [ready, setReady] = useState(false), [tab, setTab] = useState('check'), [, tick] = useState(0);
  useEffect(() => { api('me').then(r => { setUser(r.user); setReady(true); }); }, []);
  useEffect(() => { if (user) api('anchor').then(r => { if (r.paper) { A = { paper: r.paper, date: r.date }; tick(x => x + 1); } }); }, [user]);
  if (!ready) return null;
  return <main>
    <h1>Quiz Bank 2026 → 2027</h1>
    {!user ? <Login done={setUser} /> : <>
      <p>Hi {user.name} ({user.role}) <button className="t" onClick={async () => { await api('logout'); setUser(null); }}>Log out</button></p>
      {[['check', '1. Check question'], ['find', '2. Find by topic'], ['add', '3. Add topics'], ['recent', '4. Recently taken'], ['refined', 'Refined questions'], ['log', 'Activity log'], ...(user.role === 'admin' ? [['import', 'Import topics'], ['admin', 'Admin queue']] : [])].map(([k, l]) => <button key={k} className={'t ' + (tab === k ? 'on' : '')} onClick={() => setTab(k)}>{l}</button>)}
      {tab === 'check' && <Check />}{tab === 'find' && <Find />}{tab === 'add' && <Add user={user} />}{tab === 'recent' && <Recent />}{tab === 'import' && <Import />}{tab === 'log' && <Log />}{tab === 'refined' && <Refined user={user} />}{tab === 'admin' && <Admin />}
      <Models />
    </>}
    <footer>Developed by uvindu sandakelum</footer>
  </main>;
}

function Login({ done }) {
  const [name, setName] = useState(''), [password, setP] = useState(''), [e, setE] = useState('');
  const [tr, setTr] = useState(false);
  const go = async () => { setTr(true); if (!name.trim() || !password) return; const r = await api('login', { name, password }); r.ok ? done({ name: r.name, role: r.role }) : setE(r.error); };
  return <div className="card"><h3>Sign up / Log in</h3><In v={name} set={setName} ph="Your name" tried={tr} onEnter={go} />
    <In v={password} set={setP} ph="Password" tried={tr} onEnter={go} /><button onClick={go}>Enter</button><div className="err">{e}</div></div>;
}

const LESSONS = ['Lesson 1', 'Lesson 2', 'NS', 'LG', 'OS', 'Networking', 'System', 'Database', 'Python', 'Web', 'IOT', 'E-commerce', 'New trends'];
const Lesson = ({ v, set, e, ph }) => <select className={e ? 'bad' : ''} value={v} onChange={x => set(x.target.value)}><option value="">{ph}</option>{LESSONS.map(l => <option key={l}>{l}</option>)}</select>;
const inv = v => !(n(v) > 0);
const invQ = v => !(n(v) >= 1 && n(v) <= 10);
const cls = e => (e ? 'bad' : '');
const Flag = ({ r }) => r.tag ? <span className="tag">⚠ {r.tag}</span> : r.flagged ? <span className="tag pend">⚑ Removal/refining needed</span> : r.refined_by ? <span className="tag ok">✅ Refined by {r.refined_by}</span> : null;
const Dl = ({ r }) => r.refined_by && !r.flagged && !r.tag ? <a className="dl" href={`/api/file?old_paper=${r.old_paper}&q_no=${r.q_no}`}>⬇ Download refined question</a> : null;
const Msg = ({ s, children }) => s ? <div className="err">{children}</div> : null;

function Check() {
  const [p, setP] = useState(''), [q, setQ] = useState(''), [r, setR] = useState(null), [np, setNp] = useState(''), [nq, setNq] = useState('');
  const [e1, setE1] = useState(false), [e2, setE2] = useState(false), [m, setM] = useState(''), [marks, setMarks] = useState([]), [editId, setEditId] = useState(null), [conf, setConf] = useState(null);
  const loadMarks = async () => setMarks((await api('mymarks')).rows || []);
  useEffect(() => { loadMarks(); }, []);
  const reset = () => { setP(''); setQ(''); setNp(''); setNq(''); setR(null); setEditId(null); setConf(null); setE1(false); setE2(false); };
  const go = async () => { if (inv(p) || invQ(q)) { setE1(true); return; } setE1(false); setM(''); setConf(null); setR(await api('check', { old_paper: n(p), q_no: n(q) })); };
  const mark = async () => {
    if (inv(p) || invQ(q) || inv(np) || (nq && invQ(nq))) { setE2(true); return; } setE2(false);
    const x = await api('mark', { id: editId, old_paper: n(p), q_no: n(q), new_paper: n(np), new_q: n(nq) });
    if (!x.ok) { setM(x.error); return; }
    if (x.conflict) { setConf({ kind: x.kind, existing: x.existing, prop: { old_paper: n(p), q_no: n(q), new_paper: n(np), new_q: n(nq) || null } }); return; }
    reset(); setM(x.status === 'updated' ? 'Updated ✅' : 'Saved ✅'); loadMarks();
  };
  const edit = x => { setP(String(x.old_paper)); setQ(String(x.q_no)); setNp(String(x.new_paper)); setNq(x.new_q ? String(x.new_q) : ''); setEditId(x.id); setConf(null); setR(null); setM(''); setE1(false); setE2(false); };
  const report = async () => { await api('report', { existing_id: conf.existing[0].id, kind: conf.kind, ...conf.prop }); reset(); setM('Thank you! We will check on it. You can enter the next one.'); };
  const del = async () => { if (!confirm('Delete this entry?')) return; await api('unmark', { id: editId }); reset(); setM('Deleted ✅'); loadMarks(); };
  return <><div className="card"><h3>Is this old question already used in 2027?</h3>
    <input className={cls(e1 && inv(p))} placeholder="2026 quiz no" value={p} onChange={x => setP(x.target.value)} /><input className={cls(e1 && invQ(q))} placeholder="Question no" value={q} onChange={x => setQ(x.target.value)} onKeyDown={x => x.key === 'Enter' && go()} /><button onClick={go}>Check</button>
    <Msg s={e1}>Enter the quiz number and a question number from 1 to 10</Msg>
    {r && <>
      {r.question && <div className="card">{r.question.lesson && <b>[{r.question.lesson}] </b>}Topic: {r.question.topic} <Flag r={r.question} /> <Dl r={r.question} /></div>}
      {r.used.length ? r.used.map((u, i) => <div key={i} className="note">Taken for the 2027 quiz {u.new_paper}{u.new_q ? ` Q${u.new_q}` : ''} — {dm(u.new_paper)}</div>) : <div className="note">Not used yet ✅</div>}</>}
    {(r || editId) && <><hr /><b>{editId ? 'Editing a saved entry:' : 'Mark as taken:'}</b><br /><input className={cls(e2 && inv(np))} placeholder="2027 quiz no" value={np} onChange={x => setNp(x.target.value)} /><input className={cls(e2 && nq && invQ(nq))} placeholder="2027 Q no" value={nq} onChange={x => setNq(x.target.value)} /><button onClick={mark}>{editId ? 'Update' : 'Save'}</button>
      {editId && <><button className="t" onClick={reset}>Cancel</button><button className="t" onClick={del}>Delete</button></>}
      <Msg s={e2}>Enter the 2026 quiz no, a question no (1 to 10) and the 2027 quiz no</Msg>
      {conf && (() => { const sl = conf.kind === 's', same = conf.existing.some(e => sl ? e.old_paper === conf.prop.old_paper && e.q_no === conf.prop.q_no : e.new_paper === conf.prop.new_paper && (e.new_q || null) === conf.prop.new_q);
        return <div className="card"><span className="err">{sl ? 'This place is already filled:' : 'Already entered for this question:'}</span>
          {conf.existing.map(e => <div key={e.id}>2027 Quiz no {e.new_paper}{e.new_q ? ` Que ${e.new_q}` : ''}{sl && ` = 2026 Quiz no ${e.old_paper} Que ${e.q_no}`} (entered by {e.by})</div>)}
          <div className="note">{same ? 'That is the same entry, so nothing was added.' : 'If your new entry is the correct one, press Report and an admin will check both.'}</div>
          {!same && <button onClick={report}>Report</button>}<button className="t" onClick={() => setConf(null)}>{same ? 'OK' : 'Cancel'}</button></div>; })()}</>}
  </div>
  {m && <div className="note">{m}</div>}
  {marks.length > 0 && <div className="card"><b>Your last marked (click one to edit)</b><br />{marks.map(x => <button key={x.id} className="t" onClick={() => edit(x)}>2026 Quiz no {x.old_paper} Que {x.q_no} → 2027 Quiz no {x.new_paper}{x.new_q ? ` Que ${x.new_q}` : ''}</button>)}</div>}</>;
}

function Row({ r, mark }) {
  const [fl, setFl] = useState(false), rr = { ...r, flagged: r.flagged || fl };
  const report = async () => { if (!confirm('Report this as a bad question? An admin will check it.')) return; const x = await api('flag', { old_paper: r.old_paper, q_no: r.q_no }); x.ok ? setFl(true) : alert(x.error); };
  return <div className="card">2026 Quiz {r.old_paper} · Q{r.q_no} — {r.lesson && <b>[{r.lesson}] </b>}{r.topic} <Flag r={rr} /> <Dl r={rr} />
    {r.used.map((u, i) => <div key={i} className="note">Used again in 2027 quiz {u.p}{u.q ? ` Q${u.q}` : ''} — {dm(u.p)}</div>)}
    <div>{mark && <button onClick={async () => { const p = prompt('2027 quiz number?'); if (p) { const x = await api('mark', { old_paper: r.old_paper, q_no: r.q_no, new_paper: n(p) }); alert(x.conflict ? `Already entered the 2027 Quiz no ${x.existing[0].new_paper}${x.existing[0].new_q ? ` Que ${x.existing[0].new_q}` : ''} for this question. Use the Check tab to report if it is wrong.` : x.ok ? 'Saved' : x.error); } }}>Mark taken</button>}{!rr.flagged && !r.tag && <button className="t" onClick={report}>⚑ Report as a bad question</button>}</div></div>;
}

function Find() {
  const [t, setT] = useState(''), [r, setR] = useState(null), [busy, setB] = useState(false), [er, setEr] = useState(false), [lesson, setL] = useState('');
  const go = async () => { if (!t.trim() && !lesson) { setEr(true); return; } setEr(false); setB(true); setR(await api('search', { topic: t, lesson })); setB(false); };
  return <div className="card"><h3>Find questions by topic</h3><Lesson v={lesson} set={setL} ph="Any lesson" /><input className={cls(er)} style={{ width: '70%' }} placeholder="e.g. K-map to S.O.P." value={t} onChange={x => setT(x.target.value)} onKeyDown={x => x.key === 'Enter' && go()} /><button onClick={go}>{busy ? '...' : 'Search'}</button>
    <Msg s={er}>Enter a topic or choose a lesson</Msg>
    {r?.error && <div className="err">{r.error}</div>}
    {r?.same && <><h3>Same topic ({r.same.length})</h3>{r.same.map(x => <Row key={x.old_paper + '-' + x.q_no} r={x} mark />)}
      <h3>Near topics ({r.near.length})</h3>{r.near.map(x => <Row key={x.old_paper + '-' + x.q_no} r={x} mark />)}
      <h3>Already used in 2027 ({r.taken.length})</h3>{r.taken.map(x => <Row key={x.old_paper + '-' + x.q_no} r={x} />)}</>}
  </div>;
}

function Add({ user }) {
  const [p, setP] = useState(''), [q, setQ] = useState(''), [t, setT] = useState(''), [bad, setBad] = useState(false), [lesson, setL] = useState('');
  const [m, setM] = useState(null), [er, setEr] = useState(false), [note, setNote] = useState(null), [mine, setMine] = useState([]);
  const loadMine = async () => setMine((await api('mine')).rows || []);
  useEffect(() => { loadMine(); }, []);
  useEffect(() => { setNote(null); if (n(p) > 0 && n(q) > 0) api('check', { old_paper: n(p), q_no: n(q) }).then(r => setNote(r.question)); }, [p, q]);
  const go = async () => {
    if (inv(p) || invQ(q) || !t.trim() || !lesson) { setEr(true); setM(null); return; } setEr(false);
    if (note && note.added_by !== user.name && !confirm(`User ${note.added_by} already put the topic "${note.topic}" to this question. Replace it?`)) return;
    const r = await api('add', { old_paper: n(p), q_no: n(q), topic: t, lesson, bad });
    if (!r.ok) { setM({ e: 1, s: r.error }); return; }
    setM({ s: r.status === 'updated' ? 'Updated ✅' : 'Saved ✅' }); setQ(n(q) < 10 ? String(n(q) + 1) : ''); setT(''); setBad(false); loadMine();
  };
  return <div className="card"><h3>Add topic of an old question</h3>
    <input className={cls(er && inv(p))} placeholder="2026 quiz no" value={p} onChange={x => setP(x.target.value)} /><input className={cls(er && invQ(q))} placeholder="Question no" value={q} onChange={x => setQ(x.target.value)} /><Lesson v={lesson} set={setL} e={er && !lesson} ph="Lesson…" /><br />
    {note && <div className="note">ℹ {note.added_by === user.name ? 'You' : `User ${note.added_by}`} already put the topic to this question: "{note.topic}"</div>}
    <input className={cls(er && !t.trim())} style={{ width: '90%' }} placeholder="Topic" value={t} onChange={x => setT(x.target.value)} onKeyDown={x => x.key === 'Enter' && go()} /><br />
    <label><input type="checkbox" checked={bad} onChange={x => setBad(x.target.checked)} /> This is a bad question</label><br />
    <Msg s={er}>Enter {[inv(p) && 'the quiz number', invQ(q) && 'a question number (1 to 10)', !t.trim() && 'the topic', !lesson && 'the lesson'].filter(Boolean).join(', ')}</Msg>
    <button onClick={go}>Save</button> {m && <span className={m.e ? 'err' : 'note'}>{m.s}</span>}
    {mine.length > 0 && <><h3>Your last added</h3>{mine.map(r => <div className="card" key={r.old_paper + '-' + r.q_no}>Quiz {r.old_paper} · Q{r.q_no} — {r.lesson && <b>[{r.lesson}] </b>}{r.topic} <Flag r={r} /> <button className="t" onClick={() => { setP(String(r.old_paper)); setQ(String(r.q_no)); setT(r.topic); setL(r.lesson || ''); setBad(false); setM(null); }}>Edit</button></div>)}</>}
  </div>;
}

function Fix({ r, done }) {
  const [by, setBy] = useState(''), [f, setF] = useState(null), [m, setM] = useState('');
  const pick = x => { const file = x.target.files[0]; if (!file) return; if (file.size > 3e6) { setM('File must be under 3 MB'); return; } const rd = new FileReader(); rd.onload = () => { setF({ name: file.name, b64: String(rd.result).split(',')[1] }); setM(''); }; rd.readAsDataURL(file); };
  const refine = async () => { if (!by.trim() || !f) { setM('Enter the name and choose the Word file'); return; } const x = await api('refine', { old_paper: r.old_paper, q_no: r.q_no, by: by.trim(), fname: f.name, b64: f.b64 }); x.ok ? done() : setM(x.error); };
  const act = async tag => { await api('tag', { old_paper: r.old_paper, q_no: r.q_no, tag }); done(); };
  return <div className="card"><b>2026 Quiz {r.old_paper} Q{r.q_no}</b> {r.lesson && `[${r.lesson}] `}— {r.topic} <span className="note">(topic added by {r.added_by})</span><br />
    <button onClick={() => act("Don't use this question")}>Don't use this question</button><button className="t" onClick={() => act(null)}>Dismiss (it is fine)</button>
    <div style={{ marginTop: 8 }}><b>Refined it?</b> <input placeholder="Refined by (name)" value={by} onChange={x => setBy(x.target.value)} /><input type="file" accept=".doc,.docx" onChange={pick} /><button onClick={refine}>Mark refined</button> <span className="err">{m}</span></div></div>;
}

function Refined({ user }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { api('refined').then(r => setRows(r.rows || [])); }, []);
  return <div className="card"><h3>Refined questions</h3>{rows && rows.length === 0 && <span className="note">No refined questions yet</span>}
    {(rows || []).map(r => <div className="card" key={r.old_paper + '-' + r.q_no}>2026 Quiz {r.old_paper} · Q{r.q_no} — {r.lesson && <b>[{r.lesson}] </b>}{r.topic} <span className="tag ok">✅ Refined by {r.refined_by}</span>{user.role === 'admin' && <> <a className="dl" href={`/api/file?old_paper=${r.old_paper}&q_no=${r.q_no}`}>⬇ Word file</a></>}</div>)}</div>;
}

function Admin() {
  const [rows, setRows] = useState([]); const load = async () => setRows((await api('queue')).rows || []); useEffect(() => { load(); }, []);
  const tag = async (r) => { const t = prompt('Tag text', 'Not good to use'); if (t) { await api('tag', { old_paper: r.old_paper, q_no: r.q_no, tag: t }); load(); } };
  const dismiss = async (r) => { await api('tag', { old_paper: r.old_paper, q_no: r.q_no, tag: null }); load(); };
  const [reps, setReps] = useState([]); const loadR = async () => setReps((await api('reports')).rows || []); useEffect(() => { loadR(); }, []);
  const resolve = async (id, keep) => { await api('resolve', { id, keep }); loadR(); };
  const qs = (p, q) => `2027 Quiz no ${p}${q ? ` Que ${q}` : ''}`;
  const [ap, setAp] = useState(String(A.paper)), [ad, setAd] = useState(A.date), [am, setAm] = useState('');
  const saveA = async () => { const r = await api('setanchor', { paper: n(ap), date: ad }); if (r.ok) { A = { paper: n(ap), date: ad }; setAm('Saved ✅'); } else setAm(r.error); };
  return <><div className="card"><h3>Series date setting</h3>2027 quiz no <input style={{ width: 90 }} value={ap} onChange={x => setAp(x.target.value)} /> is published on <input type="date" value={ad} onChange={x => setAd(x.target.value)} /><button onClick={saveA}>Save</button> <span className="note">{am}</span></div>
  <div className="card"><h3>Duplicate entry reports ({reps.length})</h3>
    {reps.length === 0 && <span className="note">No reports</span>}
    {reps.map(r => <div className="card" key={r.id}>{r.kind === 's' ? <><b>{qs(r.p_paper, r.p_q)}</b><br />A (saved by {r.e_by || '?'}): {r.e_paper ? `2026 Quiz no ${r.e_old} Que ${r.e_qno}` : '(removed)'}<br />B (reported by {r.reported_by}): 2026 Quiz no {r.old_paper} Que {r.q_no}<br /></> : <><b>2026 Quiz no {r.old_paper} Que {r.q_no}</b><br />
      A (saved by {r.e_by || '?'}): {r.e_paper ? qs(r.e_paper, r.e_q) : '(removed)'}<br />B (reported by {r.reported_by}): {qs(r.p_paper, r.p_q)}<br /></>}
      <button onClick={() => resolve(r.id, 'a')}>Keep A (drop B)</button><button onClick={() => resolve(r.id, 'b')}>Keep B (replace A)</button></div>)}</div>
  <div className="card"><h3>Removal/refining needed ({rows.length})</h3>{rows.length === 0 && <span className="note">Nothing waiting</span>}{rows.map(r => <Fix key={r.old_paper + '-' + r.q_no} r={r} done={load} />)}</div></>;
}

const keyOf = r => r.old_paper + '-' + r.q_no;
function Tbl({ paper, rows, hi }) {
  const d = dd(paper);
  return <div className="card"><b>2027 Quiz no {paper}</b> <span className="note">· paper {d === 0 ? 'is issued today' : d < 0 ? `was issued ${-d} day${d === -1 ? '' : 's'} ago` : `will be issued in ${d} day${d === 1 ? '' : 's'}`}</span>
    {!rows.length ? <div className="err">This paper doesn't have taken questions from the 2026 series, or no data entered.</div> :
      <div style={{ overflowX: 'auto' }}><table className="sm"><thead><tr><th>Q no</th><th>Taken from 2026</th><th>Question topic</th><th>Lesson</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className={hi?.has(keyOf(r)) ? 'hr' : ''}><td>{r.new_q || '–'}</td><td>Quiz {r.old_paper} Que {r.q_no}</td><td>{r.topic || '(topic not entered)'} <Flag r={r} /></td><td>{r.lesson || '–'}</td></tr>)}</tbody></table></div>}</div>;
}

function Recent() {
  const [sp, setSp] = useState(''), [sr, setSr] = useState(null), [e1, setE1] = useState(false), [rec, setRec] = useState([]);
  const [cp, setCp] = useState(''), [cr, setCr] = useState(null), [e2, setE2] = useState(false);
  const [ta, setTa] = useState(''), [tb, setTb] = useState(''), [tr, setTr] = useState(null), [e3, setE3] = useState(false);
  useEffect(() => { api('recent').then(r => setRec(r.papers || [])); }, []);
  const search = async () => { if (inv(sp)) { setE1(true); return; } setE1(false); setSr({ paper: n(sp), rows: (await api('paper', { paper: n(sp) })).rows || [] }); };
  const cmp = async () => { if (inv(cp)) { setE2(true); return; } setE2(false); setCr({ paper: n(cp), ...(await api('compare', { paper: n(cp) })) }); };
  const cmp2 = async () => {
    if (inv(ta) || inv(tb)) { setE3(true); return; } setE3(false);
    const [x, y] = await Promise.all([api('paper', { paper: n(ta) }), api('paper', { paper: n(tb) })]);
    const kx = new Set((x.rows || []).map(keyOf)), both = new Set((y.rows || []).map(keyOf).filter(v => kx.has(v)));
    setTr({ a: { paper: n(ta), rows: x.rows || [] }, b: { paper: n(tb), rows: y.rows || [] }, both });
  };
  return <div className="sm">
    <div className="card"><h3>Search an earlier paper</h3><input className={cls(e1)} placeholder="2027 quiz no" value={sp} onChange={x => setSp(x.target.value)} onKeyDown={x => x.key === 'Enter' && search()} /><button onClick={search}>Search</button>
      <Msg s={e1}>Enter a quiz number</Msg>{sr && <Tbl {...sr} />}</div>
    <h3>Most recently entered papers</h3>{rec.length === 0 && <span className="note">No data yet</span>}{rec.map(p => <Tbl key={p.paper} {...p} />)}
    <div className="card"><h3>Find repeats in the previous 45 days</h3><input className={cls(e2)} placeholder="2027 quiz no" value={cp} onChange={x => setCp(x.target.value)} /><button onClick={cmp}>Compare</button>
      <Msg s={e2}>Enter a quiz number</Msg>
      {cr && (cr.total === 0 ? <div className="err">This paper doesn't have taken questions from the 2026 series, or no data entered.</div> : cr.rows.length === 0 ? <div className="note">No repeated questions with papers {Math.max(1, cr.paper - 45)} to {cr.paper - 1} ✅</div> :
        cr.rows.map(r => <div className="card" key={keyOf(r)}><b>2027 Quiz {cr.paper} · Q{r.new_q || '?'}</b> = 2026 Quiz {r.old_paper} Que {r.q_no}{r.lesson && ` [${r.lesson}]`}<br />{r.topic}
          {r.hits.map((h, i) => <div key={i} className="note">↳ also in 2027 Quiz {h.paper}{h.q ? ` Que ${h.q}` : ''} · {h.gap} day{h.gap === 1 ? '' : 's'} earlier</div>)}</div>))}</div>
    <div className="card"><h3>Compare any two papers</h3><input className={cls(e3 && inv(ta))} placeholder="Paper A" value={ta} onChange={x => setTa(x.target.value)} /><input className={cls(e3 && inv(tb))} placeholder="Paper B" value={tb} onChange={x => setTb(x.target.value)} /><button onClick={cmp2}>Compare</button>
      <Msg s={e3}>Enter both quiz numbers</Msg>
      {tr && <><div className={tr.both.size ? 'err' : 'note'}>{tr.both.size ? `${tr.both.size} repeated question${tr.both.size > 1 ? 's' : ''} found (highlighted)` : 'No repeated questions between these two papers ✅'}</div>
        <Tbl {...tr.a} hi={tr.both} /><Tbl {...tr.b} hi={tr.both} /></>}</div>
  </div>;
}

const parseCsv = t => t.split(/\r?\n/).filter(l => l.trim()).map(l => { const d = l.includes('\t') ? '\t' : ','; const out = []; let c = '', q = false;
  for (const ch of l) { if (ch === '"') q = !q; else if (ch === d && !q) { out.push(c.trim()); c = ''; } else c += ch; } out.push(c.trim()); return out; });

function Import() {
  const [txt, setTxt] = useState(''), [over, setOver] = useState(false), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  const rows = [], bad = [];
  parseCsv(txt).forEach((r, i) => {
    if (i === 0 && isNaN(parseInt(r[0]))) return;
    const lesson = LESSONS.find(l => l.toLowerCase() === (r[3] || '').toLowerCase()), o = parseInt(r[0]), q = parseInt(r[1]), t = r[2] || '';
    const why = !(o > 0) ? 'bad paper number' : !(q >= 1 && q <= 10) ? 'question no must be 1 to 10' : !t || /^unreadable$/i.test(t) ? 'no topic' : !lesson ? `unknown lesson "${r[3] || ''}"` : '';
    why ? bad.push(`Line ${i + 1}: ${why}`) : rows.push({ old_paper: o, q_no: q, topic: t, lesson });
  });
  const file = x => { const f = x.target.files[0]; if (f) { const rd = new FileReader(); rd.onload = () => setTxt(String(rd.result)); rd.readAsText(f); } };
  const go = async () => {
    setBusy(true); setMsg(''); let a = 0, u = 0, s = 0;
    for (let i = 0; i < rows.length; i += 500) { const r = await api('import', { rows: rows.slice(i, i + 500), overwrite: over }); if (!r.ok) { setMsg(r.error || 'Failed'); setBusy(false); return; } a += r.inserted; u += r.updated; s += r.skipped; }
    setMsg(`✅ ${a} new, ${u} updated, ${s} skipped (already existed)`); setTxt(''); setBusy(false);
  };
  return <div className="card"><h3>Import topics from a file</h3>
    <div className="note">Columns: paper, question, topic, lesson (CSV, or paste straight from Excel).</div>
    <input type="file" accept=".csv,.txt" onChange={file} /><br />
    <textarea style={{ width: '100%', height: 180, background: '#111a2e', color: '#dbe7ff', border: '1px solid #1e3a6e', borderRadius: 8, padding: 8 }} placeholder={'paper,question,topic,lesson\n500,1,K-map to S.O.P.,LG'} value={txt} onChange={x => setTxt(x.target.value)} />
    <label><input type="checkbox" checked={over} onChange={x => setOver(x.target.checked)} /> Overwrite topics that already exist (otherwise they are skipped)</label><br />
    {txt && <div><span className="note">{rows.length} rows ready</span> {bad.length > 0 && <span className="err">· {bad.length} problem rows (will be skipped)</span>}{bad.slice(0, 6).map(b => <div key={b} className="err">{b}</div>)}</div>}
    <button disabled={!rows.length || busy} onClick={go}>{busy ? 'Importing...' : `Import ${rows.length} rows`}</button> <span className="note">{msg}</span></div>;
}

function Log() {
  const [rows, setRows] = useState([]), [f, setF] = useState('');
  useEffect(() => { api('logs').then(r => setRows(r.rows || [])); }, []);
  const shown = rows.filter(r => !f || (r.who + ' ' + r.act + ' ' + r.detail).toLowerCase().includes(f.toLowerCase()));
  return <div className="card sm"><h3>Activity log (latest 300)</h3><input placeholder="Filter by user or text" value={f} onChange={x => setF(x.target.value)} />
    <div style={{ overflowX: 'auto' }}><table className="sm"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
      <tbody>{shown.map(r => <tr key={r.id}><td>{new Date(r.at).toLocaleString('en-GB')}</td><td>{r.who}{r.role === 'admin' ? ' (admin)' : ''}</td><td>{r.act}</td><td>{r.detail}</td></tr>)}</tbody></table></div>{shown.length === 0 && <span className="note">Nothing logged yet</span>}</div>;
}

function Models() {
  const [m, setM] = useState({ models: [], current: '' });
  useEffect(() => { api('models').then(setM); }, []);
  return <aside>AI model<br /><select value={m.current} onChange={async x => { await api('setmodel', { model: x.target.value }); setM({ ...m, current: x.target.value }); }}>
    {[...new Set([m.current, ...m.models])].filter(Boolean).map(x => <option key={x}>{x}</option>)}</select><br />List loads live from Gemini. Switch if one is busy.</aside>;
}
