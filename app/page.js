'use client';
import { useState, useEffect } from 'react';
const api = async (a, b = {}) => { const r = await fetch('/api/' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return { ok: r.ok, ...(await r.json()) }; };
const dm = n => `day ${n} (month ${Math.ceil(n / 30)})`;
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
  const [user, setUser] = useState(null), [ready, setReady] = useState(false), [tab, setTab] = useState('check');
  useEffect(() => { api('me').then(r => { setUser(r.user); setReady(true); }); }, []);
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
const cls = e => (e ? 'bad' : '');
const Msg = ({ s, children }) => s ? <div className="err">{children}</div> : null;

function Check() {
  const [p, setP] = useState(''), [q, setQ] = useState(''), [r, setR] = useState(null), [np, setNp] = useState(''), [nq, setNq] = useState('');
  const [e1, setE1] = useState(false), [e2, setE2] = useState(false), [m, setM] = useState('');
  const go = async () => { if (inv(p) || inv(q)) { setE1(true); return; } setE1(false); setR(await api('check', { old_paper: n(p), q_no: n(q) })); };
  const mark = async () => { if (inv(np)) { setE2(true); return; } setE2(false); await api('mark', { old_paper: n(p), q_no: n(q), new_paper: n(np), new_q: n(nq) }); setM('Saved ✅'); go(); };
  return <div className="card"><h3>Is this old question already used in 2027?</h3>
    <input className={cls(e1 && inv(p))} placeholder="2026 quiz no" value={p} onChange={x => setP(x.target.value)} /><input className={cls(e1 && inv(q))} placeholder="Question no" value={q} onChange={x => setQ(x.target.value)} onKeyDown={x => x.key === 'Enter' && go()} /><button onClick={go}>Check</button>
    <Msg s={e1}>Enter the quiz number and question number</Msg>
    {r && <>
      {r.question && <div className="card">{r.question.lesson && <b>[{r.question.lesson}] </b>}Topic: {r.question.topic} {r.question.tag && <span className="tag">⚠ {r.question.tag}</span>}</div>}
      {r.used.length ? r.used.map((u, i) => <div key={i} className="note">Taken for the 2027 quiz {u.new_paper}{u.new_q ? ` Q${u.new_q}` : ''} — {dm(u.new_paper)}</div>) : <div className="note">Not used yet ✅</div>}
      <hr /><b>Mark as taken:</b><br /><input className={cls(e2)} placeholder="2027 quiz no" value={np} onChange={x => setNp(x.target.value)} /><input placeholder="2027 Q no" value={nq} onChange={x => setNq(x.target.value)} /><button onClick={mark}>Save</button>
      <Msg s={e2}>Enter the 2027 quiz number</Msg><span className="note"> {m}</span></>}
  </div>;
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
    if (inv(p) || inv(q) || !t.trim() || !lesson) { setEr(true); setM(null); return; } setEr(false);
    if (note && note.added_by !== user.name && !confirm(`User ${note.added_by} already put the topic "${note.topic}" to this question. Replace it?`)) return;
    const r = await api('add', { old_paper: n(p), q_no: n(q), topic: t, lesson, bad });
    if (!r.ok) { setM({ e: 1, s: r.error }); return; }
    setM({ s: r.status === 'updated' ? 'Updated ✅' : 'Saved ✅' }); setQ(String(n(q) + 1)); setT(''); setBad(false); loadMine();
  };
  return <div className="card"><h3>Add topic of an old question</h3>
    <input className={cls(er && inv(p))} placeholder="2026 quiz no" value={p} onChange={x => setP(x.target.value)} /><input className={cls(er && inv(q))} placeholder="Question no" value={q} onChange={x => setQ(x.target.value)} /><Lesson v={lesson} set={setL} e={er && !lesson} ph="Lesson…" /><br />
    {note && <div className="note">ℹ {note.added_by === user.name ? 'You' : `User ${note.added_by}`} already put the topic to this question: "{note.topic}"</div>}
    <input className={cls(er && !t.trim())} style={{ width: '90%' }} placeholder="Topic" value={t} onChange={x => setT(x.target.value)} onKeyDown={x => x.key === 'Enter' && go()} /><br />
    <label><input type="checkbox" checked={bad} onChange={x => setBad(x.target.checked)} /> This is a bad question</label><br />
    <Msg s={er}>Enter {[inv(p) && 'the quiz number', inv(q) && 'the question number', !t.trim() && 'the topic', !lesson && 'the lesson'].filter(Boolean).join(', ')}</Msg>
    <button onClick={go}>Save</button> {m && <span className={m.e ? 'err' : 'note'}>{m.s}</span>}
    {mine.length > 0 && <><h3>Your last added</h3>{mine.map(r => <div className="card" key={r.old_paper + '-' + r.q_no}>Quiz {r.old_paper} · Q{r.q_no} — {r.lesson && <b>[{r.lesson}] </b>}{r.topic} <button className="t" onClick={() => { setP(String(r.old_paper)); setQ(String(r.q_no)); setT(r.topic); setL(r.lesson || ''); setBad(false); setM(null); }}>Edit</button></div>)}</>}
  </div>;
}

function Admin() {
  const [rows, setRows] = useState([]); const load = async () => setRows((await api('queue')).rows || []); useEffect(() => { load(); }, []);
  const tag = async (r) => { const t = prompt('Tag text', 'Not good to use'); if (t) { await api('tag', { old_paper: r.old_paper, q_no: r.q_no, tag: t }); load(); } };
  const dismiss = async (r) => { await api('tag', { old_paper: r.old_paper, q_no: r.q_no, tag: null }); load(); };
  return <div className="card"><h3>Reported bad questions ({rows.length})</h3>{rows.map(r => <div className="card" key={r.old_paper + '-' + r.q_no}>Quiz {r.old_paper} Q{r.q_no} — {r.topic} (by {r.added_by})<br /><button onClick={() => tag(r)}>Add tag</button><button className="t" onClick={() => dismiss(r)}>Dismiss</button></div>)}</div>;
}

function Models() {
  const [m, setM] = useState({ models: [], current: '' });
  useEffect(() => { api('models').then(setM); }, []);
  return <aside>AI model<br /><select value={m.current} onChange={async x => { await api('setmodel', { model: x.target.value }); setM({ ...m, current: x.target.value }); }}>
    {[...new Set([m.current, ...m.models])].filter(Boolean).map(x => <option key={x}>{x}</option>)}</select><br />List loads live from Gemini. Switch if one is busy.</aside>;
}
