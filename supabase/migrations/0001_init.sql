-- Forma: initial schema. Apply via the Supabase SQL Editor (see supabase/README.md).
-- Column names mirror src/lib/schema.ts. Every table carries user_id; RLS limits each user to their own rows.
-- Timestamps are written by the client (sync compares updated_at), so there is no updated_at trigger.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sex text not null check (sex in ('male', 'female')),
  birth_year int not null,
  height_cm numeric not null,
  country text not null default 'BY',
  timezone text not null,
  goal text not null check (goal in ('fat', 'muscle', 'tone')),
  experience text not null check (experience in ('none', 'some', 'regular')),
  days_per_week int not null check (days_per_week between 2 and 4),
  session_min int not null check (session_min in (20, 30, 45)),
  activity_level text not null check (activity_level in ('sedentary', 'light', 'moderate', 'high')),
  injuries jsonb not null default '[]',
  equipment jsonb not null default '[]',
  figure text not null default 'male' check (figure in ('male', 'female')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (id = user_id)
);

create table public.body_metrics (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric,
  waist_cm numeric,
  neck_cm numeric,
  hip_cm numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.tests (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  kind text not null check (kind in ('baseline', 'checkpoint')),
  results jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tests_user_date on public.tests (user_id, date);

create table public.programs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_date date not null,
  goal text not null check (goal in ('fat', 'muscle', 'tone')),
  template text not null check (template in ('fullbody', 'upperlower')),
  config jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index programs_one_active on public.programs (user_id) where active;

create table public.planned_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  date date not null,
  week int not null check (week between 1 and 4),
  day_type text not null check (day_type in ('A', 'B', 'U', 'L')),
  exercises jsonb not null,
  est_min int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index planned_sessions_user_date on public.planned_sessions (user_id, date);

create table public.workouts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  planned_session_id uuid references public.planned_sessions(id) on delete set null,
  started_at timestamptz not null,
  finished_at timestamptz,
  pre_soreness int,
  pre_sleep int,
  pre_energy int,
  rpe int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workouts_user_started on public.workouts (user_id, started_at);

create table public.workout_sets (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id text not null,
  set_no int not null,
  reps int,
  duration_s int,
  weight_kg numeric,
  band_kg numeric,
  rir int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workout_sets_workout on public.workout_sets (workout_id);

create table public.nutrition_targets (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date_from date not null,
  kcal int not null,
  protein_g int not null,
  fat_g int not null,
  carbs_g int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row level security: a user sees and writes only their own rows.
alter table public.profiles enable row level security;
alter table public.body_metrics enable row level security;
alter table public.tests enable row level security;
alter table public.programs enable row level security;
alter table public.planned_sessions enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.nutrition_targets enable row level security;

create policy "own rows" on public.profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.body_metrics for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.tests for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.programs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.planned_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.workouts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.workout_sets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.nutrition_targets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
