-- FundForge core schema for Express + Supabase data layer
-- Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id text primary key,
  email text unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  creator_id text not null references profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  image_url text,
  goal_amount numeric(12,2) not null check (goal_amount > 0),
  raised_amount numeric(12,2) not null default 0 check (raised_amount >= 0),
  backers_count integer not null default 0 check (backers_count >= 0),
  deadline date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_rewards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table if not exists project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  target_amount numeric(12,2) not null check (target_amount > 0),
  sequence integer not null,
  reached boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists contributions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  backer_id text not null references profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'succeeded',
  created_at timestamptz not null default now()
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists comment_replies (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references comments(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  author_id text not null references profiles(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists project_views (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists milestone_releases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  milestone_id uuid not null references project_milestones(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending',
  proof_url text,
  approved_by text references profiles(id),
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_creator_id on projects(creator_id);
create index if not exists idx_projects_category on projects(category);
create index if not exists idx_projects_created_at on projects(created_at desc);
create index if not exists idx_contributions_project_id on contributions(project_id);
create index if not exists idx_contributions_backer_id on contributions(backer_id);
create index if not exists idx_comments_project_id on comments(project_id);
create index if not exists idx_project_updates_project_id on project_updates(project_id);
create index if not exists idx_project_views_project_id on project_views(project_id);
create index if not exists idx_project_views_user_id on project_views(user_id);

