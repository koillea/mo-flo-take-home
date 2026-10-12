-- Bonus: Supabase design for multi-company, versioned knowledge bases.
-- Design artifact only. Not connected to the app.

create table companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  website_url text not null,
  current_version_id uuid,
  created_at timestamptz not null default now(),
  unique (owner_id, website_url)
);

-- Every save creates a new immutable version. companies.current_version_id points at the live one.
create table knowledge_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  version_number int not null,
  data jsonb not null,                -- the KnowledgeBase JSON from lib/types.ts
  schema_version int not null default 1,
  source text not null check (source in ('scrape', 'manual_edit', 'enrichment')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (company_id, version_number)
);

alter table companies
  add constraint companies_current_version_fk
  foreign key (current_version_id) references knowledge_versions(id);

-- Row Level Security: users only see and write their own companies and versions.
alter table companies enable row level security;
alter table knowledge_versions enable row level security;

create policy "owners read companies" on companies
  for select using (owner_id = auth.uid());
create policy "owners write companies" on companies
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owners read versions" on knowledge_versions
  for select using (
    exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid())
  );
create policy "owners insert versions" on knowledge_versions
  for insert with check (
    exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid())
  );
-- No update or delete policy on versions: history is append-only.

create index on knowledge_versions (company_id, version_number desc);
