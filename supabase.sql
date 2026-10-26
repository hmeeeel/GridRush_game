create table if not exists public.players (
  id           uuid primary key,
  token_hash   text not null unique,
  nick         text not null,
  color        text not null,
  score        integer not null default 0,
  x            integer,
  y            integer,
  on_field     boolean not null default false,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create unique index if not exists players_nick_lower_idx on public.players (lower(nick));

create table if not exists public.game_state (
  id                    integer primary key default 1 check (id = 1),
  state_version         bigint  not null default 0,
  total_items_collected bigint  not null default 0,
  schema_version        integer not null default 1,
  round_number          integer not null default 1,
  item                  jsonb, 
  updated_at            timestamptz not null default now()
);

create table if not exists public.score_log (
  id        bigint generated always as identity primary key,
  ts        timestamptz not null default now(),
  player_id uuid not null references public.players(id),
  item_id   uuid not null unique,
  x         integer not null,
  y         integer not null
);
create index if not exists score_log_player_idx on public.score_log (player_id);

alter table public.players    enable row level security;
alter table public.game_state enable row level security;
alter table public.score_log  enable row level security;
