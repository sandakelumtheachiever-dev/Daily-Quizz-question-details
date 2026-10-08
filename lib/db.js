import { neon } from '@neondatabase/serverless';
let sql, ready;
export async function db() {
  if (!sql) sql = neon(process.env.DATABASE_URL);
  if (!ready) ready = (async () => {
    await sql`create table if not exists questions(old_paper int, q_no int, topic text not null, flagged bool default false, tag text, added_by text, primary key(old_paper,q_no))`;
    await sql`create table if not exists used(id serial primary key, old_paper int, q_no int, new_paper int, new_q int, by text, at timestamptz default now())`;
    await sql`alter table questions add column if not exists updated_at timestamptz default now()`;
    await sql`alter table questions add column if not exists lesson text`;
    await sql`create table if not exists reports(id serial primary key, old_paper int, q_no int, existing_id int, p_paper int, p_q int, reported_by text, done bool default false, at timestamptz default now())`;
    await sql`create table if not exists settings(k text primary key, v text)`;
  })();
  await ready; return sql;
}
