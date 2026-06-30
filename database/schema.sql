-- Resonance Lab PostgreSQL schema
-- Educational, meditation, relaxation, creativity, and self-observation platform.
-- No table should be used to store diagnostic conclusions or disease-treatment claims.

create extension if not exists "uuid-ossp";

create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  display_name text,
  preferred_language text not null default 'en',
  theme text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table frequency_presets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text,
  evidence_label text not null check (
    evidence_label in (
      'Research-supported',
      'Hypothesis',
      'Historical spiritual teaching',
      'User experience'
    )
  ),
  mode text not null check (mode in ('pure', 'binaural', 'isochronic')),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table session_protocols (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  preset_id uuid references frequency_presets(id) on delete set null,
  title text not null,
  module text not null,
  duration_minutes integer not null check (duration_minutes between 1 and 240),
  breath_rate numeric(4, 1) check (breath_rate between 1 and 30),
  intention text,
  affirmation text,
  visualization_script text,
  safety_disclaimer_acknowledged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table frequency_layers (
  id uuid primary key default uuid_generate_v4(),
  preset_id uuid not null references frequency_presets(id) on delete cascade,
  label text not null,
  frequency_hz numeric(10, 3) not null check (frequency_hz between 1 and 20000),
  volume numeric(5, 4) not null check (volume between 0 and 1),
  pan numeric(4, 3) not null check (pan between -1 and 1),
  waveform text not null check (waveform in ('sine', 'square', 'sawtooth', 'triangle')),
  enabled boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);

create table journal_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  protocol_id uuid references session_protocols(id) on delete set null,
  mood_before integer check (mood_before between 1 and 10),
  mood_after integer check (mood_after between 1 and 10),
  focus_level integer check (focus_level between 1 and 10),
  energy_level integer check (energy_level between 1 and 10),
  sleep_quality integer check (sleep_quality between 1 and 10),
  stress_perception integer check (stress_perception between 1 and 10),
  notes text,
  created_at timestamptz not null default now()
);

create table experiment_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  protocol_id uuid references session_protocols(id) on delete set null,
  event_type text not null,
  event_payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table biofeedback_samples (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  protocol_id uuid references session_protocols(id) on delete set null,
  source text not null,
  sample_type text not null,
  value numeric(12, 5) not null,
  unit text not null,
  sampled_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table habit_checkins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  checkin_date date not null,
  completed boolean not null default false,
  notes text,
  unique (user_id, checkin_date)
);

create table scheduled_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  protocol_id uuid not null references session_protocols(id) on delete cascade,
  scheduled_for timestamptz not null,
  reminder_minutes_before integer not null default 10,
  status text not null default 'scheduled' check (
    status in ('scheduled', 'completed', 'skipped', 'cancelled')
  ),
  created_at timestamptz not null default now()
);

create table assistant_threads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  provider text not null default 'local-safety-fallback',
  created_at timestamptz not null default now()
);

create table assistant_messages (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references assistant_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  evidence_sections jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table research_sources (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  source_url text,
  evidence_label text not null check (
    evidence_label in (
      'Research-supported',
      'Hypothesis',
      'Historical spiritual teaching',
      'User experience'
    )
  ),
  summary text not null,
  usage_guidance text not null,
  created_at timestamptz not null default now()
);

create table community_protocols (
  id uuid primary key default uuid_generate_v4(),
  source_protocol_id uuid not null references session_protocols(id) on delete cascade,
  submitted_by uuid not null references users(id) on delete cascade,
  moderation_status text not null default 'pending' check (
    moderation_status in ('pending', 'approved', 'rejected')
  ),
  moderation_notes text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index journal_entries_user_created_idx on journal_entries(user_id, created_at desc);
create index experiment_events_user_created_idx on experiment_events(user_id, created_at desc);
create index biofeedback_samples_user_sampled_idx on biofeedback_samples(user_id, sampled_at desc);
create index scheduled_sessions_user_time_idx on scheduled_sessions(user_id, scheduled_for);
create index research_sources_label_idx on research_sources(evidence_label);
