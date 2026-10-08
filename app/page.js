'use client';
import { useState, useEffect } from 'react';
const api = async (a, b = {}) => { const r = await fetch('/api/' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return { ok: r.ok, ...(await r.json()) }; };
let A = { paper: 346, date: '2026-10-08' };
const dm = n => {
  const [y, m, d] = A.date.split('-').map(Number), t = new Date();
  const dt = Date.UTC(y, m - 1, d) + (n - A.paper) * 864e5, td = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
  const diff = Math.round((dt - td) / 864e5);
  const rel = diff === 0 ? 'today' : diff < 0 ? `${-diff} day${diff === -1 ? '' : 's'} ago` : `in ${diff} day${diff === 1 ? '' : 's'}`;
  return `${new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })} · ${rel}`;
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
      {[['check', '1. Check question'], ['find', '2. Find by topic'], ['add', '3. Add topics'], ...(user.role === 'admin' ? [['admin', 'Admin queue']] : [])].map(([k, l]) => <button key={k} className={'t ' + (tab === k ? 'on' : '')} onClick={() => setTab(k)}>{l}</button>)}
      {tab === 'check' && <Check />}{tab === 'find' && <Find />}{tab === 'add' && <Add user={user} />}{tab === 'admin' && <Admin />}
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
const Msg = ({ s, children }) => s ? <div className="err">{children}</div> : null;

function Check() {
  const [p, setP] = useState(''), [q, setQ] = useState(''), [r, setR] = useState(null), [np, setNp] = useState(''), [nq, setNq] = useState('');
  const [e1, setE1] = useState(false), [e2, setE2] = useState(false), [m, setM] = useState(''), [marks, setMarks] = useState([]), [editId, setEditId] = useState(null);
  const loadMarks = async () => setMarks((await api('mymarks')).rows || []);
  useEffect(() => { loadMarks(); }, []);
  const reset = () => { setP(''); setQ(''); setNp(''); setNq(''); setR(null); setEditId(null); setE1(false); setE2(false); };
  const go = async () => { if (inv(p) || invQ(q)) { setE1(true); return; } setE1(false); setM(''); setR(await api('check', { old_paper: n(p), q_no: n(q) })); };
  const mark = async () => {
    if (inv(p) || invQ(q) || inv(np) || (nq && invQ(nq))) { setE2(true); return; } setE2(false);
    const x = await api('mark', { id: editId, old_paper: n(p), q_no: n(q), new_paper: n(np), new_q: n(nq) });
    if (!x.ok) { setM(x.error); return; }
    reset(); setM(x.status === 'updated' ? 'Updated ✅' : 'Saved ✅'); loadMarks();
  };
  const edit = x => { setP(String(x.old_paper)); setQ(String(x.q_no)); setNp(String(x.new_paper)); setNq(x.new_q ? String(x.new_q) : ''); setEditId(x.id); setR(null); setM(''); setE1(false); setE2(false); };
  const del = async () => { if (!confirm('Delete this entry?')) return; await api('unmark', { id: editId }); reset(); setM('Deleted ✅'); loadMarks(); };
  return <><div className="card"><h3>Is this old question already used in 2027?</h3>
    <input className={cls(e1 && inv(p))} placeholder="2026 quiz no" value={p} onChange={x => setP(x.target.value)} /><input className={cls(e1 && invQ(q))} placeholder="Question no" value={q} onChange={x => setQ(x.target.value)} onKeyDown={x => x.key === 'Enter' && go()} /><button onClick={go}>Check</button>
    <Msg s={e1}>Enter the quiz number and a question number from 1 to 10</Msg>
    {r && <>
      {r.question && <div className="card">{r.question.lesson && <b>[{r.question.lesson}] </b>}Topic: {r.question.topic} {r.question.tag && <span className="tag">⚠ {r.question.tag}</span>}</div>}
      {r.used.length ? r.used.map((u, i) => <div key={i} className="note">Taken for the 2027 quiz {u.new_paper}{u.new_q ? ` Q${u.new_q}` : ''} — {dm(u.new_paper)}</div>) : <div className="note">Not used yet ✅</div>}</>}
    {(r || editId) && <><hr /><b>{editId ? 'Editing a saved entry:' : 'Mark as taken:'}</b><br /><input className={cls(e2 && inv(np))} placeholder="2027 quiz no" value={np} onChange={x => setNp(x.target.value)} /><input className={cls(e2 && nq && invQ(nq))} placeholder="2027 Q no" value={nq} onChange={x => setNq(x.target.value)} /><button onClick={mark}>{editId ? 'Update' : 'Save'}</button>
      {editId && <><button className="t" onClick={reset}>Cancel</button><button className="t" onClick={del}>Delete</button></>}
      <Msg s={e2}>Enter the 2026 quiz no, a question no (1 to 10) and the 2027 quiz no</Msg></>}
  </div>
  {m && <div className="note">{m}</div>}
  {marks.length > 0 && <div className="card"><b>Your last marked (click one to edit)</b><br />{marks.map(x => <button key={x.id} className="t" onClick={() => edit(x)}>2026 Quiz no {x.old_paper} Que {x.q_no} → 2027 Quiz no {x.new_paper}{x.new_q ? ` Que ${x.new_q}` : ''}</button>)}</div>}</>;
}

function Row({ r, mark }) {
  return <div className="card">2026 Quiz {r.old_paper} · Q{r.q_no} — {r.lesson && <b>[{r.lesson}] </b>}{r.topic} {r.tag && <span className="tag">⚠ {r.tag}</span>}
    {r.used.map((u, i) => <div key={i} className="note">Used again in 2027 quiz {u.p}{u.q ? ` Q${u.q}` : ''} — {dm(u.p)}</div>)}
    {mark && <div><button onClick={async () => { const p = prompt('2027 quiz number?'); if (p) { await api('mark', { old_paper: r.old_paper, q_no: r.q_no, new_paper: n(p) }); alert('Saved'); } }}>Mark taken</button></div>}</div>;
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
    {mine.length > 0 && <><h3>Your last added</h3>{mine.map(r => <div className="card" key={r.old_paper + '-' + r.q_no}>Quiz {r.old_paper} · Q{r.q_no} — {r.lesson && <b>[{r.lesson}] </b>}{r.topic} <button className="t" onClick={() => { setP(String(r.old_paper)); setQ(String(r.q_no)); setT(r.topic); setL(r.lesson || ''); setBad(false); setM(null); }}>Edit</button></div>)}</>}
  </div>;
}

function Admin() {
  const [rows, setRows] = useState([]); const load = async () => setRows((await api('queue')).rows || []); useEffect(() => { load(); }, []);
  const tag = async (r) => { const t = prompt('Tag text', 'Not good to use'); if (t) { await api('tag', { old_paper: r.old_paper, q_no: r.q_no, tag: t }); load(); } };
  const dismiss = async (r) => { await api('tag', { old_paper: r.old_paper, q_no: r.q_no, tag: null }); load(); };
  const [ap, setAp] = useState(String(A.paper)), [ad, setAd] = useState(A.date), [am, setAm] = useState('');
  const saveA = async () => { const r = await api('setanchor', { paper: n(ap), date: ad }); if (r.ok) { A = { paper: n(ap), date: ad }; setAm('Saved ✅'); } else setAm(r.error); };
  return <div className="card"><h3>Series date setting</h3>2027 quiz no <input style={{ width: 90 }} value={ap} onChange={x => setAp(x.target.value)} /> is published on <input type="date" value={ad} onChange={x => setAd(x.target.value)} /><button onClick={saveA}>Save</button> <span className="note">{am}</span>
    <h3>Reported bad questions ({rows.length})</h3>{rows.map(r => <div className="card" key={r.old_paper + '-' + r.q_no}>Quiz {r.old_paper} Q{r.q_no} — {r.topic} (by {r.added_by})<br /><button onClick={() => tag(r)}>Add tag</button><button className="t" onClick={() => dismiss(r)}>Dismiss</button></div>)}</div>;
}

function Models() {
  const [m, setM] = useState({ models: [], current: '' });
  useEffect(() => { api('models').then(setM); }, []);
  return <aside>AI model<br /><select value={m.current} onChange={async x => { await api('setmodel', { model: x.target.value }); setM({ ...m, current: x.target.value }); }}>
    {[...new Set([m.current, ...m.models])].filter(Boolean).map(x => <option key={x}>{x}</option>)}</select><br />List loads live from Gemini. Switch if one is busy.</aside>;
}
