-- Ajoute stop_code sur bus_horaires : sur Zou, stop_name est ambigu
-- (plusieurs villes partagent "Gare Routiere"), seul stop_code préfixé
-- par la ville ("TOULON _ Gare Routiere") lève l'ambiguïté pour
-- l'affichage public.
alter table bus_horaires
  add column if not exists stop_code text;
