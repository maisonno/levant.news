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

| Réseau  | Ligne | Trajet                                              | Source GTFS |
|---------|-------|-----------------------------------------------------|-------------|
| Mistral | 67    | Gare de Hyères ↔ Port La Gavine                    | `s3.eu-west-1.amazonaws.com/.../gtfs-complet.zip` |
| Zou     | 878   | Gare Routière de Toulon ↔ Le Lavandou (via Aéroport Hyères sur certains trips) | `datasud.fr` (redirection GTFS Région SUD) |

---

## Base de données

### Migrations SQL

Appliquer dans l'ordre dans **Supabase Dashboard → SQL Editor** :

- `supabase/migrations/20260405_bus_horaires.sql` — création des tables
- `supabase/migrations/20260406_bus_destination.sql` — ajout des colonnes `destination` et `travel_time_min`

### Table `bus_horaires`

**Un enregistrement par (réseau × trip × arrêt de départ configuré).** La table ne contient que des départs, jamais des arrivées.

| Colonne           | Type        | Description                                                        |
|-------------------|-------------|-------------------------------------------------------------------|
| `id`              | text PK     | `{reseau}\|{trip_id}\|{stop_id}`                                  |
| `reseau`          | text        | `'mistral'` ou `'zou'`                                            |
| `ligne`           | text        | `'67'` ou `'878'`                                                 |
| `trip_id`         | text        | Identifiant du service dans le GTFS                               |
| `service_id`      | text        | Identifiant du calendrier de service                              |
| `direction_id`    | smallint    | `0` ou `1` (sens aller/retour dans le GTFS)                       |
| `headsign`        | text        | Destination affichée en tête de bus dans le GTFS (peut être vide) |
| `stop_id`         | text        | Identifiant GTFS de l'arrêt de départ                             |
| `stop_name`       | text        | Nom court de l'arrêt (`stop_name` dans le GTFS)                   |
| `stop_sequence`   | smallint    | Position de l'arrêt dans le trip (utilisé pour trier les blocs)   |
| `departure_time`  | text        | `HH:MM:SS` — peut dépasser `24:00:00` (services de nuit)         |
| `destination`     | text        | Label de destination calculé à l'import (ex : `'Le Lavandou'`)    |
| `travel_time_min` | smallint    | Durée de trajet en minutes jusqu'à la destination                 |
| `lundi`…`dimanche`| boolean     | Jours de service (issu de `calendar.txt`)                         |
| `date_debut`      | text        | `YYYYMMDD` — début de validité du calendrier                      |
| `date_fin`        | text        | `YYYYMMDD` — fin de validité du calendrier                        |
| `imported_at`     | timestamptz | Horodatage du dernier import                                      |

Index : `idx_bus_horaires_ligne` (ligne), `idx_bus_horaires_service` (service_id).

### Table `bus_calendar_exceptions`

Exceptions GTFS (`calendar_dates.txt`) : jours ajoutés ou supprimés hors planning habituel (jours fériés, services spéciaux, grèves…).

| Colonne          | Type     | Description                                   |
|------------------|----------|-----------------------------------------------|
| `id`             | text PK  | `{reseau}\|{service_id}\|{date}`              |
| `reseau`         | text     | `'mistral'` ou `'zou'`                        |
| `service_id`     | text     | Service concerné                              |
| `date`           | text     | `YYYYMMDD`                                    |
| `exception_type` | smallint | `1` = service ajouté, `2` = service supprimé  |

Index : `idx_bus_cal_date` (date).

---

## Import GTFS (`src/lib/gtfs/import.ts`)

### Principe

Pour chaque trip GTFS, on stocke **une seule ligne par arrêt de départ configuré**. La `destination` et le `travel_time_min` sont calculés en comparant l'heure de passage à l'arrêt de départ avec l'heure de passage à l'arrêt d'arrivée pour le même `trip_id`. L'arrêt d'arrivée n'est pas stocké en base — il sert uniquement au calcul.

### Configuration des réseaux (`BUS_NETWORKS`)

```typescript
interface DepartureConfig {
  departurePattern:  string   // sous-chaîne du champ de correspondance (arrêt de départ)
  destinationPattern: string  // idem (arrêt d'arrivée, pour calcul de durée)
  destinationLabel:  string   // label affiché côté client
  requiredPattern?:  string   // ne crée la ligne QUE SI ce stop est présent dans le trip
  onlyIfNoStop?:     string   // ne crée la ligne QUE SI ce stop est ABSENT du trip
}

interface DirectionConfig {
  direction_id: number
  departures: DepartureConfig[]
}

interface NetworkConfig {
  reseau:          'mistral' | 'zou'
  url:             string
  lignes:          string[]          // route_short_name dans le GTFS
  directions:      DirectionConfig[]
  matchField?:     'stop_name' | 'stop_code'  // champ GTFS utilisé (défaut : 'stop_name')
  excludePatterns?: string[]
}
```

### Pourquoi `matchField: 'stop_code'` pour Zou 878

Dans le GTFS Zou, `stop_name = "Gare Routiere"` est partagé par 8 villes du réseau. Le `stop_code` inclut un préfixe ville et est unique :

| stop_id       | stop_code                        | stop_name      |
|---------------|----------------------------------|----------------|
| 01052-8313700 | `TOULON _ Gare Routiere`         | Gare Routiere  |
| 00181-8306900 | `HYERES _ Aéroport`              | Aéroport       |
| 03041-8307000 | `LE LAVANDOU _ Square des Heros` | Square des Heros (dir 0) |
| 03042-8307000 | `LE LAVANDOU _ Square des Heros` | Square des Heros (dir 1) |

Avec `matchField: 'stop_code'`, le pattern `'toulon _ gare routiere'` ne peut matcher que Toulon, sans `excludePatterns`.

### Logique des arrêts de départ par direction (878)

Sur la ligne 878, certains trips s'arrêtent à l'Aéroport de Hyères, d'autres non (rare : 2 trips en dir 0, 3 en dir 1). La configuration gère ce cas via `requiredPattern` / `onlyIfNoStop` :

**Direction 1 — Toulon → Le Lavandou :**

| Départ   | Condition          | Destination    |
|----------|--------------------|----------------|
| Toulon   | toujours           | Le Lavandou    |
| Aéroport | si trip via aéroport | Le Lavandou  |

**Direction 0 — Le Lavandou → Toulon :**

| Départ      | Condition              | Destination             |
|-------------|------------------------|-------------------------|
| Le Lavandou | trip **avec** Aéroport | Aéroport Hyères-Toulon  |
| Le Lavandou | trip **sans** Aéroport | Gare Routière de Toulon |

### Étapes de l'import

1. **Téléchargement** du ZIP GTFS via `fetch` avec `redirect: 'follow'`
2. **Extraction** avec JSZip (`jszip@^3.10.1`)
3. **Parsing** de `routes.txt`, `trips.txt`, `stops.txt`, `calendar.txt`, `calendar_dates.txt`
4. **Sélection des arrêts** : union de tous les patterns (départ + destination + conditions) filtrés sur `matchField`
5. **Parsing optimisé** de `stop_times.txt` : ligne par ligne, seules les lignes où `trip_id` ET `stop_id` sont pertinents sont conservées
6. **Regroupement** des stop_times par `trip_id`
7. **Construction** : pour chaque trip × `DepartureConfig`, évaluation des conditions, calcul de `travel_time_min`, création d'une ligne
8. **Upsert Supabase** : suppression des anciennes données du réseau + insertion en lots de 500

### Calcul de `travel_time_min`

```
travel_time_min = heure_passage(arrêt_destination) - heure_passage(arrêt_départ)
```

Les deux heures proviennent du même `trip_id` dans `stop_times.txt`. Si l'arrêt de destination n'est pas trouvé dans le trip, `travel_time_min` est `null`.

### Problème d'encodage JSZip

JSZip stocke les fichiers comme des *binary strings* (1 char JS = 1 octet), ce qui fait que les octets UTF-8 des caractères accentués (`é` = `0xC3 0xA9`) arrivent en JS comme deux caractères (`Ã©`).

La fonction `fixLatin1ToUtf8()` corrige ce cas sans risque :

```typescript
function fixLatin1ToUtf8(s: string): string {
  try {
    const bytes = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xFF
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return s // déjà correctement encodé
  }
}
```

---

## Cron job (`/api/cron/import-bus`)

### Planification

```json
// vercel.json
{ "crons": [{ "path": "/api/cron/import-bus", "schedule": "0 4 * * *" }] }
```

Import automatique chaque nuit à **4h00 UTC**.

### Variables d'environnement requises

| Variable                    | Description                                                              |
|-----------------------------|--------------------------------------------------------------------------|
| `CRON_SECRET`               | Secret partagé pour protéger l'endpoint                                  |
| `NEXT_PUBLIC_SUPABASE_URL`  | URL du projet Supabase                                                   |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (droits INSERT/DELETE, contourne les RLS). **Ne pas utiliser la clé anon.** |

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
    {
      "reseau": "mistral",
      "horaires": 42,
      "exceptions": 3,
      "skippedTrips": 0,
      "stopsFound": ["[Gare (Hyères)] Gare (Hyères)", "[Port La Gavine] Port La Gavine"]
    },
    {
      "reseau": "zou",
      "horaires": 69,
      "exceptions": 12,
      "skippedTrips": 0,
      "stopsFound": ["[TOULON _ Gare Routiere] Gare Routiere", "..."]
    }
  ],
  "errors": []
}
```

Le champ `stopsFound` affiche désormais `[stop_code] stop_name` pour faciliter le diagnostic.

### Mode découverte (`?log_stops=true`)

Pour afficher dans les logs Vercel les arrêts retenus par les patterns (utile si les noms GTFS changent) :

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

| Paramètre | Défaut      | Description                 |
|-----------|-------------|-----------------------------|
| `date`    | aujourd'hui | Date au format `YYYY-MM-DD` |
| `ligne`   | `878`       | `878` ou `67`               |

### Logique calendaire GTFS

1. **Services réguliers** : lignes où le jour de semaine est `true` ET la date est dans `[date_debut, date_fin]`
2. **Exceptions type 2** : suppriment des services réguliers (jours fériés, grèves…)
3. **Exceptions type 1** : ajoutent des services non réguliers (service spécial…)

### Réponse

```typescript
{
  date:          string           // YYYY-MM-DD
  ligne:         string           // '878' | '67'
  aucun_service: boolean          // true si aucun service actif ce jour
  stops: Array<{
    stop_name:  string            // nom brut du GTFS (transformé par stopLabel() côté client)
    stop_id:    string
    departures: Array<{
      time:            string     // 'HH:MM' normalisé (les heures > 24h sont converties)
      destination:     string     // label destination calculé à l'import
      travel_time_min: number | null
    }>
  }>
}
```

Les `stops` sont triés par `stop_sequence` minimum. Les `departures` sont triées par heure. Cache de 5 minutes (`revalidate = 300`).

---

## Frontend (`src/app/transport/TransportClient.tsx`)

### Transformation des noms d'arrêts (`stopLabel`)

La table stocke les `stop_name` bruts du GTFS (courts, non accentués). `stopLabel()` les transforme en labels lisibles. Elle est appliquée sur les en-têtes de blocs (départ) et sur les destinations.

```typescript
const STOP_LABELS = [
  { pattern: 'aeroport promenade',  label: 'Aéroport — Promenade'           },  // plus spécifique en premier
  { pattern: 'square des heros',    label: 'Le Lavandou (Square des Héros)' },
  { pattern: 'gare routiere',       label: 'Gare Routière de Toulon'        },
  { pattern: 'aeroport',           label: 'Aéroport Hyères-Toulon'         },
  { pattern: 'gare (hy',           label: 'Gare de Hyères'                 },
  { pattern: 'port la gavine',      label: 'Port La Gavine'                 },
]
```

Les `destination` stockées en base sont déjà des labels propres (`'Le Lavandou'`, `'Gare Routière de Toulon'`…) : `stopLabel()` les retourne identiques. Elle est néanmoins appelée systématiquement pour homogénéité.

### Format des horaires

`formatBusTime()` convertit le format GTFS en format français : `"08:30"` → `"8h30"`, `"17:05"` → `"17h05"`.

### Résultat attendu

**Ligne 878 (Zou)** — 4 blocs :

```
🚏 Départ de Gare Routière de Toulon
    7h42  →  Le Lavandou          76 min

🚏 Départ de Aéroport Hyères-Toulon
    14h30  →  Le Lavandou         36 min

🚏 Départ de Le Lavandou (Square des Héros)
    8h30   →  Gare Routière de Toulon   76 min
    9h54   →  Aéroport Hyères-Toulon    36 min
```

**Ligne 67 (Mistral)** — 2 blocs :

```
🚏 Départ de Gare de Hyères
    6h43  →  Port La Gavine       8 min

🚏 Départ de Port La Gavine
    7h30  →  Gare de Hyères       8 min
```

---

## Maintenance

### Ajuster les arrêts suivis

Si les noms d'arrêts changent dans le GTFS d'un opérateur, mettre à jour les patterns dans `BUS_NETWORKS` (`src/lib/gtfs/import.ts`), puis relancer l'import manuellement. Pour Zou 878, les patterns sont sur `stop_code` ; pour Mistral 67, sur `stop_name`.

Pour identifier les noms exacts, appeler le cron avec `?log_stops=true` et consulter les logs Vercel.

### Ajouter une ligne

1. Ajouter une entrée dans `BUS_NETWORKS` avec les `directions` et `DepartureConfig` appropriés
2. Ajouter la ligne dans `LIGNES` de `TransportClient.tsx`
3. Compléter `STOP_LABELS` si les `stop_name` GTFS ne sont pas encore couverts
4. Relancer l'import

### Changer de source GTFS

Les URLs GTFS sont susceptibles de changer (surtout Zou/datasud.fr). En cas de 404, chercher sur [transport.data.gouv.fr](https://transport.data.gouv.fr) avec le nom du réseau, et mettre à jour `url` dans `BUS_NETWORKS`.

---

## Dépendances

| Package                 | Version   | Usage                                                              |
|-------------------------|-----------|--------------------------------------------------------------------|
| `jszip`                 | `^3.10.1` | Extraction des fichiers ZIP GTFS                                   |
| `@supabase/supabase-js` | —         | Client Supabase avec `service_role` dans le cron (pas `@supabase/ssr`) |
