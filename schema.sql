create table questions (
  id bigserial primary key,
  old_paper int not null,
  old_q int not null,
  topic text not null,
  question_text text,
  added_by text,
  report_status text,            -- null | pending | tagged | dismissed
  tag text,
  created_at timestamptz default now(),
  unique (old_paper, old_q)
);

create table usage (
  id bigserial primary key,
  old_paper int not null,
  old_q int not null,
  new_paper int not null,
  new_q int,
  used_by text,
  created_at timestamptz default now(),
  unique (old_paper, old_q, new_paper)
);

create table settings (
  key text primary key,
  value text
);

-- lock tables so only the server (service key) can touch them
alter table questions enable row level security;
alter table usage enable row level security;
alter table settings enable row level security;
