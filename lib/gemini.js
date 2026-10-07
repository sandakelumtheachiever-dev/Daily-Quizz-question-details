import { db } from './db';
const B = 'https://generativelanguage.googleapis.com/v1beta/';
export async function getModel() {
  const sql = await db(); const r = await sql`select v from settings where k='model'`;
  return r[0]?.v || 'gemini-2.5-flash';
}
export async function listModels() {
  const r = await fetch(`${B}models?pageSize=200&key=${process.env.GEMINI_API_KEY}`); const j = await r.json();
  return (j.models || []).filter(m => m.supportedGenerationMethods?.includes('generateContent')
    && /gemini-.*flash/.test(m.name) && !/tts|image|live|audio|embed|robotics|computer/.test(m.name))
    .map(m => m.name.replace('models/', '')).sort();
}
export async function gem(prompt) {
  const model = await getModel();
  const r = await fetch(`${B}models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Gemini error');
  return JSON.parse(j.candidates[0].content.parts[0].text);
}
