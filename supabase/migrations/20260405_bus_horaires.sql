-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : horaires de bus (données GTFS importées quotidiennement)
-- ─────────────────────────────────────────────────────────────────────────────

-- Table principale : un enregistrement par (réseau × trip × arrêt pertinent)
create table if not exists bus_horaires (
  id              text        primary key,           -- {reseau}|{trip_id}|{stop_id}
  reseau          text        not null,              -- 'mistral' | 'zou'
  ligne           text        not null,              -- '67' | '878'
  trip_id         text        not null,
  service_id      text        not null,
  direction_id    smallint    not null default 0,    -- 0 ou 1
  headsign        text,                              -- destination affichée en tête de bus
  stop_id         text        not null,
  stop_name       text        not null,
  stop_sequence   smallint    not null,
  departure_time  text        not null,              -- HH:MM:SS (peut dépasser 24:00:00)
  -- Jours de service (depuis calendar.txt)
  lundi           boolean     not null default false,
  mardi           boolean     not null default false,
  mercredi        boolean     not null default false,
  jeudi           boolean     not null default false,
  vendredi        boolean     not null default false,
  samedi          boolean     not null default false,
  dimanche        boolean     not null default false,
  date_debut      text        not null default '',   -- YYYYMMDD
  date_fin        text        not null default '',   -- YYYYMMDD
  imported_at     timestamptz not null default now()
);

create index if not exists idx_bus_horaires_ligne   on bus_horaires (ligne);
create index if not exists idx_bus_horaires_service on bus_horaires (service_id);

-- Exceptions calendaires (calendar_dates.txt) : jours ajoutés ou supprimés
create table if not exists bus_calendar_exceptions (
  id             text     primary key,               -- {reseau}|{service_id}|{date}
  reseau         text     not null,
  service_id     text     not null,
  date           text     not null,                  -- YYYYMMDD
  exception_type smallint not null                   -- 1 = ajouté, 2 = supprimé
);

create index if not exists idx_bus_cal_date on bus_calendar_exceptions (date);
