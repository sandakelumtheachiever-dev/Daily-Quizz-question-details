'use client';
import { useState, useEffect } from 'react';
const api = async (a, b = {}) => { const r = await fetch('/api/' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return { ok: r.ok, ...(await r.json()) }; };
const dm = n => `day ${n} (month ${Math.ceil(n / 30)})`;
const n = v => parseInt(v);

export default function Home() {
  const [user, setUser] = useState(null), [ready, setReady] = useState(false), [tab, setTab] = useState('check');
  useEffect(() => { api('me').then(r => { setUser(r.user); setReady(true); }); }, []);
  if (!ready) return null;
  return <main>
    <h1>Quiz Bank 2026 → 2027</h1>
    {!user ? <Login done={setUser} /> : <>
      <p>Hi {user.name} ({user.role}) <button className="t" onClick={async () => { await api('logout'); setUser(null); }}>Log out</button></p>
      {[['check', '1. Check question'], ['find', '2. Find by topic'], ['add', '3. Add topics'], ...(user.role === 'admin' ? [['admin', 'Admin queue']] : [])].map(([k, l]) => <button key={k} className={'t ' + (tab === k ? 'on' : '')} onClick={() => setTab(k)}>{l}</button>)}
      {tab === 'check' && <Check />}{tab === 'find' && <Find />}{tab === 'add' && <Add />}{tab === 'admin' && <Admin />}
      <Models />
    </>}
    <footer>Developed by uvindu sandakelum</footer>
  </main>;
}

function Login({ done }) {
  const [name, setName] = useState(''), [password, setP] = useState(''), [e, setE] = useState('');
  const go = async () => { const r = await api('login', { name, password }); r.ok ? done({ name: r.name, role: r.role }) : setE(r.error); };
  return <div className="card"><h3>Sign up / Log in</h3><input placeholder="Your name" value={name} onChange={x => setName(x.target.value)} />
    <input type="password" placeholder="Password" value={password} onChange={x => setP(x.target.value)} /><button onClick={go}>Enter</button><div className="err">{e}</div></div>;
}

function Check() {
  const [p, setP] = useState(''), [q, setQ] = useState(''), [r, setR] = useState(null), [np, setNp] = useState(''), [nq, setNq] = useState('');
  const go = async () => setR(await api('check', { old_paper: n(p), q_no: n(q) }));
  const mark = async () => { await api('mark', { old_paper: n(p), q_no: n(q), new_paper: n(np), new_q: n(nq) }); go(); };
  return <div className="card"><h3>Is this old question already used in 2027?</h3>
    <input placeholder="2026 quiz no" value={p} onChange={x => setP(x.target.value)} /><input placeholder="Question no" value={q} onChange={x => setQ(x.target.value)} /><button onClick={go}>Check</button>
    {r && <>
      {r.question && <div className="card">Topic: {r.question.topic} {r.question.tag && <span className="tag">⚠ {r.question.tag}</span>}</div>}
      {r.used.length ? r.used.map((u, i) => <div key={i} className="note">Taken for the 2027 quiz {u.new_paper}{u.new_q ? ` Q${u.new_q}` : ''} — {dm(u.new_paper)}</div>) : <div className="note">Not used yet ✅</div>}
      <hr /><b>Mark as taken:</b><br /><input placeholder="2027 quiz no" value={np} onChange={x => setNp(x.target.value)} /><input placeholder="2027 Q no" value={nq} onChange={x => setNq(x.target.value)} /><button onClick={mark}>Save</button></>}
  </div>;
}

function Row({ r, mark }) {
  return <div className="card">2026 Quiz {r.old_paper} · Q{r.q_no} — {r.topic} {r.tag && <span className="tag">⚠ {r.tag}</span>}
    {r.used.map((u, i) => <div key={i} className="note">Used again in 2027 quiz {u.p}{u.q ? ` Q${u.q}` : ''} — {dm(u.p)}</div>)}
    {mark && <div><button onClick={async () => { const p = prompt('2027 quiz number?'); if (p) { await api('mark', { old_paper: r.old_paper, q_no: r.q_no, new_paper: n(p) }); alert('Saved'); } }}>Mark taken</button></div>}</div>;
}

function Find() {
  const [t, setT] = useState(''), [r, setR] = useState(null), [busy, setB] = useState(false);
  const go = async () => { setB(true); setR(await api('search', { topic: t })); setB(false); };
  return <div className="card"><h3>Find questions by topic</h3><input style={{ width: '70%' }} placeholder="e.g. K-map to S.O.P." value={t} onChange={x => setT(x.target.value)} onKeyDown={x => x.key === 'Enter' && go()} /><button onClick={go}>{busy ? '...' : 'Search'}</button>
    {r?.error && <div className="err">{r.error}</div>}
    {r?.same && <><h3>Same topic ({r.same.length})</h3>{r.same.map(x => <Row key={x.old_paper + '-' + x.q_no} r={x} mark />)}
      <h3>Near topics ({r.near.length})</h3>{r.near.map(x => <Row key={x.old_paper + '-' + x.q_no} r={x} mark />)}
      <h3>Already used in 2027 ({r.taken.length})</h3>{r.taken.map(x => <Row key={x.old_paper + '-' + x.q_no} r={x} />)}</>}
  </div>;
}

function Add() {
  const [p, setP] = useState(''), [q, setQ] = useState(''), [t, setT] = useState(''), [bad, setBad] = useState(false), [m, setM] = useState('');
  const go = async () => { const r = await api('add', { old_paper: n(p), q_no: n(q), topic: t, bad }); setM(r.ok ? 'Saved ✅' : r.error); if (r.ok) { setQ(String(n(q) + 1 || '')); setT(''); setBad(false); } };
  return <div className="card"><h3>Add topic of an old question</h3>
    <input placeholder="2026 quiz no" value={p} onChange={x => setP(x.target.value)} /><input placeholder="Question no" value={q} onChange={x => setQ(x.target.value)} /><br />
    <input style={{ width: '90%' }} placeholder="Topic" value={t} onChange={x => setT(x.target.value)} /><br />
    <label><input type="checkbox" checked={bad} onChange={x => setBad(x.target.checked)} /> This is a bad question</label><br /><button onClick={go}>Save</button> <span className="note">{m}</span></div>;
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
