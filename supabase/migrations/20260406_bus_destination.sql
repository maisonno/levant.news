-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : ajout des champs destination et travel_time_min sur bus_horaires
--
-- destination     : label affiché de l'arrêt suivant (calculé à l'import)
-- travel_time_min : durée de trajet en minutes jusqu'à cet arrêt
-- ─────────────────────────────────────────────────────────────────────────────

alter table bus_horaires
  add column if not exists destination      text     not null default '',
  add column if not exists travel_time_min  smallint;
