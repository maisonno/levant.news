# Horaires de bus — Documentation technique

> Fonctionnalité Bus de la page `/transport`.
> Affiche les horaires des lignes Zou 878 et Mistral 67 à partir de données GTFS importées chaque nuit.

---

## Vue d'ensemble

```
GTFS (ZIP externe)
    ↓  [Vercel Cron 4h00]
/api/cron/import-bus
    ↓  src/lib/gtfs/import.ts
Supabase (bus_horaires + bus_calendar_exceptions)
    ↓  [requête utilisateur]
/api/bus?date=YYYY-MM-DD&ligne=878
    ↓
TransportClient.tsx → onglet Bus
```

---

## Lignes couvertes

| Réseau   | Ligne | Trajet                                          | Source GTFS                                                                                      |
|----------|-------|-------------------------------------------------|--------------------------------------------------------------------------------------------------|
| Mistral  | 67    | Gare de Hyères ↔ Port La Gavine                 | `s3.eu-west-1.amazonaws.com/files.orchestra.ratpdev.com/networks/rd-toulon/exports/gtfs-complet.zip` |
| Zou      | 878   | Gare Routière de Toulon ↔ Le Lavandou (+ Aéroport Hyères) | `datasud.fr` (redirection vers fichier GTFS Région SUD)                                  |

---

## Base de données

### Table `bus_horaires`

Un enregistrement par triplet **(réseau × trip × arrêt pertinent)**.

| Colonne          | Type        | Description                                      |
|------------------|-------------|--------------------------------------------------|
| `id`             | text PK     | `{reseau}\|{trip_id}\|{stop_id}`                 |
| `reseau`         | text        | `'mistral'` ou `'zou'`                           |
| `ligne`          | text        | `'67'` ou `'878'`                                |
| `trip_id`        | text        | Identifiant du service dans le GTFS              |
| `service_id`     | text        | Identifiant du calendrier de service             |
| `direction_id`   | smallint    | `0` ou `1` (sens aller/retour dans le GTFS)      |
| `headsign`       | text        | Destination affichée en tête de bus (peut être vide) |
| `stop_id`        | text        | Identifiant de l'arrêt dans le GTFS              |
| `stop_name`      | text        | Nom de l'arrêt tel que dans le GTFS              |
| `stop_sequence`  | smallint    | Position de l'arrêt dans le trip                 |
| `departure_time` | text        | `HH:MM:SS` — peut dépasser `24:00:00` (services de nuit) |
| `lundi`…`dimanche` | boolean   | Jours de service (issu de `calendar.txt`)        |
| `date_debut`     | text        | `YYYYMMDD` — début de validité du calendrier     |
| `date_fin`       | text        | `YYYYMMDD` — fin de validité du calendrier       |
| `imported_at`    | timestamptz | Horodatage du dernier import                     |

Index : `idx_bus_horaires_ligne` (ligne), `idx_bus_horaires_service` (service_id).

### Table `bus_calendar_exceptions`

Exceptions GTFS (`calendar_dates.txt`) : jours ajoutés ou supprimés hors planning habituel (jours fériés, services spéciaux, grèves…).

| Colonne          | Type     | Description                         |
|------------------|----------|-------------------------------------|
| `id`             | text PK  | `{reseau}\|{service_id}\|{date}`    |
| `reseau`         | text     | `'mistral'` ou `'zou'`              |
| `service_id`     | text     | Service concerné                    |
| `date`           | text     | `YYYYMMDD`                          |
| `exception_type` | smallint | `1` = service ajouté, `2` = service supprimé |

Index : `idx_bus_cal_date` (date).

### Appliquer la migration

Coller le contenu de `supabase/migrations/20260405_bus_horaires.sql` dans **Supabase Dashboard → SQL Editor**.

---

## Import GTFS (`src/lib/gtfs/import.ts`)

### Configuration des réseaux (`BUS_NETWORKS`)

Chaque réseau est décrit par un objet `NetworkConfig` :

```typescript
interface NetworkConfig {
  reseau: 'mistral' | 'zou'
  url: string            // URL du ZIP GTFS
  lignes: string[]       // route_short_name à importer (ex: ['878'])
  stopPatterns: string[] // sous-chaînes (normalisées) des noms d'arrêts à conserver
  excludePatterns?: string[] // sous-chaînes à EXCLURE (prioritaire sur stopPatterns)
}
```

Configuration actuelle :

```typescript
// Mistral 67 : seulement 2 terminus retenus
{ reseau: 'mistral', lignes: ['67'],
  stopPatterns: ['la gavine', 'gare (hy'] }

// Zou 878 : 3 arrêts retenus, 2 "Gare Routière" exclus
{ reseau: 'zou', lignes: ['878'],
  stopPatterns: ['des heros', 'aeroport', 'gare routiere'],
  excludePatterns: ['le lavandou', 'saint-tropez'] }
```

> **Note patterns** : la comparaison est insensible à la casse et aux accents. `excludePatterns` est appliqué en priorité : un arrêt correspondant à un pattern ET à un excludePattern est exclu.

### Étapes de l'import

1. **Téléchargement** du ZIP GTFS via `fetch` avec `redirect: 'follow'`
2. **Extraction** avec JSZip (`jszip@^3.10.1`)
3. **Parsing** de `routes.txt`, `trips.txt`, `stops.txt`, `calendar.txt`, `calendar_dates.txt`
4. **Filtrage** des routes par `route_short_name`, des arrêts par patterns
5. **Parsing optimisé** de `stop_times.txt` : traitement ligne par ligne, seules les lignes où `trip_id ∈ trips pertinents` ET `stop_id ∈ arrêts pertinents` sont conservées (le fichier peut peser plusieurs dizaines de Mo)
6. **Upsert Supabase** : suppression des anciennes données du réseau + insertion en lots de 500

### Problème d'encodage JSZip

JSZip stocke les fichiers en interne comme des *binary strings* (1 char JS = 1 octet), ce qui fait que les octets UTF-8 des caractères accentués (ex : `é` = `0xC3 0xA9`) arrivent en JS comme deux caractères distincts (`Ã©`).

**Solution** — fonction `fixLatin1ToUtf8()` appliquée à chaque valeur du CSV :

```typescript
function fixLatin1ToUtf8(s: string): string {
  try {
    const bytes = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xFF
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return s // déjà bien encodé : on ne touche pas
  }
}
```

Si la string est garbled, les octets constituent du UTF-8 valide → le redécodage corrige. Si elle est déjà correcte, les octets isolés > 127 rendent le UTF-8 invalide → l'exception est capturée et la string originale est retournée.

---

## Cron job (`/api/cron/import-bus`)

### Planification

```json
// vercel.json
{ "crons": [{ "path": "/api/cron/import-bus", "schedule": "0 4 * * *" }] }
```

Import automatique chaque nuit à **4h00 UTC**.

### Variables d'environnement requises

| Variable                   | Description                                                  |
|----------------------------|--------------------------------------------------------------|
| `CRON_SECRET`              | Secret partagé pour protéger l'endpoint                      |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase                                       |
| `SUPABASE_SERVICE_ROLE_KEY`| Clé service role (droits INSERT/DELETE, contourne les RLS). **Ne pas utiliser la clé anon.** |

### Appel manuel

```bash
curl -H "Authorization: Bearer {CRON_SECRET}" \
  https://levant.news/api/cron/import-bus
```

Réponse en cas de succès :

```json
{
  "timestamp": "2026-04-06T04:00:00.000Z",
  "results": [
    { "reseau": "mistral", "horaires": 42, "exceptions": 3, "stopsFound": ["Gare (Hyères)...", "Port La Gavine"] },
    { "reseau": "zou", "horaires": 186, "exceptions": 12, "stopsFound": ["Square des Héros...", "Aéroport...", "Gare Routière..."] }
  ],
  "errors": []
}
```

### Mode découverte (`?log_stops=true`)

Pour afficher **tous les arrêts** d'une ligne dans les logs Vercel (utile pour ajuster les `stopPatterns` si les noms GTFS changent) :

```bash
curl -H "Authorization: Bearer {CRON_SECRET}" \
  "https://levant.news/api/cron/import-bus?log_stops=true"
```

---

## API horaires (`/api/bus`)

### Requête

```
GET /api/bus?date=YYYY-MM-DD&ligne=878
```

| Paramètre | Défaut     | Description              |
|-----------|------------|--------------------------|
| `date`    | aujourd'hui | Date au format `YYYY-MM-DD` |
| `ligne`   | `878`      | `878` ou `67`             |

### Logique calendaire GTFS

La logique est la suivante pour déterminer les services actifs à une date donnée :

1. **Services réguliers** : lignes où le jour de semaine est `true` ET la date est dans la plage `[date_debut, date_fin]`
2. **Exceptions type 2** : suppriment des services réguliers (jours fériés, grèves…)
3. **Exceptions type 1** : ajoutent des services non réguliers (service spécial, report de jour férié…)

### Algorithme `nextStopMap`

Pour chaque départ, on veut savoir vers quel arrêt **pertinent** le bus se dirige ensuite. Cela permet :
- d'afficher la destination correcte dans chaque bloc
- de filtrer les **arrivées terminus** (le bus ne repart pas → pas de "prochain arrêt" → on masque l'entrée)
- de séparer naturellement les deux sens de circulation sans avoir à se fier au `direction_id`

```
Pour chaque trip_id dans les résultats :
  → trier les arrêts par stop_sequence
  → arrêt[i].destination = arrêt[i+1].stop_name
  → le dernier arrêt n'a pas de destination → filtré (c'est une arrivée)
```

### Réponse

```typescript
{
  date: string           // YYYY-MM-DD
  ligne: string          // '878' | '67'
  aucun_service: boolean // true si aucun service actif ce jour
  stops: Array<{
    stop_name: string    // nom brut du GTFS (à passer dans stopLabel() côté client)
    stop_id: string
    departures: Array<{
      time: string       // 'HH:MM' normalisé (les heures > 24h sont converties)
      destination: string // nom brut du prochain arrêt pertinent
    }>
  }>
}
```

Les `stops` sont triés par `stop_sequence` minimum. Les `departures` sont triées par heure.

Cache de 5 minutes (`revalidate = 300`).

---

## Frontend (`src/app/transport/TransportClient.tsx`)

### Affichage des noms d'arrêts

Les noms d'arrêts GTFS sont techniques et parfois verbeux. La fonction `stopLabel()` les traduit en labels lisibles :

```typescript
const STOP_LABELS = [
  { pattern: 'aeroport promenade',  label: 'Aéroport — Promenade'           },
  { pattern: 'square des heros',    label: 'Le Lavandou (Square des Héros)' },
  { pattern: 'gare routiere',       label: 'Gare Routière de Toulon'        },
  { pattern: 'aeroport',           label: 'Aéroport Hyères-Toulon'         },
  { pattern: 'gare (hy',           label: 'Gare de Hyères'                 },
  { pattern: 'port la gavine',      label: 'Port La Gavine'                 },
]
```

L'ordre est important : les patterns les plus spécifiques (`aeroport promenade`) doivent précéder les plus généraux (`aeroport`).

### Format des horaires

`formatBusTime()` convertit le format GTFS en format français :

```
"08:30" → "8h30"
"17:05" → "17h05"
```

### Résultat attendu

**Ligne 878 (Zou)** — 3 blocs :

```
🚏 Départ de Le Lavandou (Square des Héros)
    8h30  →  Gare Routière de Toulon

🚏 Départ de Aéroport Hyères-Toulon
    9h30  →  Le Lavandou (Square des Héros)
    ...

🚏 Départ de Gare Routière de Toulon
    7h42  →  Le Lavandou (Square des Héros)
    ...
```

**Ligne 67 (Mistral)** — 2 blocs :

```
🚏 Départ de Gare de Hyères
    6h43  →  Port La Gavine
    ...

🚏 Départ de Port La Gavine
    7h30  →  Gare de Hyères
    ...
```

---

## Maintenance

### Ajuster les arrêts suivis

Si les noms d'arrêts changent dans le GTFS d'un opérateur, mettre à jour `stopPatterns` / `excludePatterns` dans `BUS_NETWORKS` (`src/lib/gtfs/import.ts`), puis relancer l'import manuellement.

Pour découvrir les noms exacts, appeler le cron avec `?log_stops=true` et consulter les logs Vercel.

### Ajouter une ligne

1. Ajouter une entrée dans `BUS_NETWORKS` avec les bons patterns
2. Ajouter la ligne dans `LIGNES` de `TransportClient.tsx`
3. Compléter `STOP_LABELS` si les noms d'arrêts sont nouveaux
4. Relancer l'import

### Changer de source GTFS

Les URLs GTFS sont susceptibles de changer (surtout Zou/datasud.fr). En cas de 404, chercher sur [transport.data.gouv.fr](https://transport.data.gouv.fr) avec le nom du réseau. Mettre à jour `url` dans `BUS_NETWORKS`.

---

## Dépendances

| Package  | Version      | Usage                             |
|----------|--------------|-----------------------------------|
| `jszip`  | `^3.10.1`    | Extraction des fichiers ZIP GTFS  |
| `@supabase/supabase-js` | — | Client Supabase avec `service_role` dans le cron (pas `@supabase/ssr`) |
