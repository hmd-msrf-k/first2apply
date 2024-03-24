create table
public.sites (
  id bigint generated by default as identity,
  name text not null,
  urls text[] not null,
  created_at timestamp with time zone not null default now(),
  "queryParamsToRemove" text[] null,
  logo_url text not null,
  blacklisted_paths text[] not null default '{/}'::text[],
  provider text not null,
  constraint sites_pkey primary key (id)
) tablespace pg_default;

create table
public.links (
  id bigint generated by default as identity,
  created_at timestamp with time zone not null default now(),
  user_id uuid not null default auth.uid (),
  url text not null,
  title text not null,
  site_id bigint not null,
  constraint links_pkey primary key (id),
  constraint links_site_id_fkey foreign key (site_id) references sites (id) on update restrict on delete restrict,
  constraint links_user_id_fkey foreign key (user_id) references auth.users (id) on delete restrict
) tablespace pg_default;

-- create Job Status enum with values new, applied, archived
create type public."Job Status" as enum ('new', 'applied', 'archived');
create table
public.jobs (
  id bigint generated by default as identity,
  user_id uuid not null default auth.uid (),
  "externalId" text not null,
  "externalUrl" text not null,
  "siteId" bigint not null,
  title text not null,
  "companyName" text not null,
  "companyLogo" text null,
  location text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  salary text null,
  tags text[] null,
  "jobType" text null,
  status public.Job Status not null default 'new'::"Job Status",
  description text null,
  labels text[] not null default '{}'::text[],
  constraint jobs_pkey primary key (id),
  constraint jobs_user_id_externalid_key unique (user_id, "externalId"),
  constraint jobs_user_id_fkey foreign key (user_id) references auth.users (id) on delete restrict
  constraint jobs_siteid_fkey foreign key ("siteId") references sites (id) on update restrict on delete restrict,
) tablespace pg_default;
create index jobs_user_id_updated_at_id_status_idx on public.jobs (user_id, updated_at desc, id desc, status);

create table
public.reviews (
  id bigint generated by default as identity,
  created_at timestamp with time zone not null default now(),
  user_id uuid not null default auth.uid (),
  title text not null,
  description text null,
  rating integer not null,
  constraint reviews_pkey primary key (id),
  constraint reviews_user_id_fkey foreign key (user_id) references auth.users (id) on delete restrict,
  constraint unique_user_review unique (user_id) -- This enforces one review per user for the app
) tablespace pg_default;

create table
public.html_dumps (
  id bigint generated by default as identity,
  created_at timestamp with time zone not null default now(),
  user_id uuid not null default auth.uid (),
  url text not null,
  html text not null,
  constraint html_dumps_pkey primary key (id)
) tablespace pg_default;

create table
public.notes (
  id bigint generated by default as identity,
  created_at timestamp with time zone not null default now(),
  user_id uuid not null default auth.uid (),
  text text not null,
  files text[] not null default '{}'::text[],
  job_id bigint not null,
  constraint notes_pkey primary key (id),
  constraint notes_user_id_fkey foreign key (user_id) references auth.users (id) on update cascade on delete cascade,
  constraint notes_job_id_fkey foreign key (job_id) references jobs (id) on update cascade on delete cascade
) tablespace pg_default;
alter table public.notes enable row level security;
create policy "enable all for users based on user_id" 
on public.notes 
as permissive 
for all 
to authenticated 
using (auth.uid() = user_id) 
with check (auth.uid() = user_id);

create TABLE
public.advanced_filters (
  id bigint generated by default as identity,
  name text not null,
  rules jsonb not null,
  user_id uuid not null default auth.uid (),
  created_at timestamp with time zone not null default now(),
  constraint advanced_filters_pkey primary key (id),
  constraint advanced_filters_user_id_fkey foreign key (user_id) references auth.users (id) on delete restrict
) tablespace pg_default;

alter table public.sites enable row level security;
alter table public.jobs enable row level security;
alter table public.links enable row level security;
alter table public.reviews enable row level security;
alter table public.html_dumps enable row level security;
alter table public.notes enable row level security;

-- row level security
create policy "enable select for authenticated users only" 
on public.sites 
as permissive 
for select 
to authenticated 
using (true);

create policy "enable all for users based on user_id" 
on public.links 
as permissive 
for all 
to authenticated 
using (auth.uid() = user_id) 
with check (auth.uid() = user_id);

create policy "enable all for users based on user_id" 
on public.jobs 
as permissive 
for all 
to authenticated 
using (auth.uid() = user_id) 
with check (auth.uid() = user_id);

create policy "enable insert reviews for authenticated users only" 
on public.reviews 
as permissive 
for insert 
to authenticated 
with check (auth.uid() = user_id);

create policy "enable update reviews for authenticated users only"
on public.reviews
as permissive
for update
to authenticated
using (auth.uid() = user_id);

create policy "enable select reviews for authenticated users only" 
on public.reviews 
as permissive 
for select 
to authenticated 
using (auth.uid() = user_id);

create policy "enable all for users based on user_id" 
on public.html_dumps 
as permissive 
for all 
to authenticated 
using (auth.uid() = user_id) 
with check (auth.uid() = user_id);

-- create custom DB functions
create or replace function list_jobs(jobs_status "Job Status", jobs_after text, jobs_page_size integer)
returns setof jobs as $$
declare
  after_id integer;
  after_updated_at timestamp;
begin
  if jobs_after is not null then
    after_id := split_part(jobs_after, '!', 1)::integer;
    after_updated_at := split_part(jobs_after, '!', 2)::timestamp;
    return query
    select *
    from jobs
    where status = jobs_status and (updated_at, id) < (after_updated_at, after_id)
    order by updated_at desc, id desc
    limit jobs_page_size;
  else
    return query
    select *
    from jobs
    where status = jobs_status
    order by updated_at desc, id desc
    limit jobs_page_size;
  end if;
end; $$
language plpgsql;