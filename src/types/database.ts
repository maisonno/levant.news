// ─── Types de base ────────────────────────────────────────────────────────────

export type Role = 'user' | 'pro' | 'admin'
export type NotifPref = 'toujours' | 'jamais' | 'sur_ile'
export type ObjetType = 'PERDU' | 'TROUVE'

// ─── Tables ───────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  prenom: string
  nom: string
  telephone: string | null
  role: Role
  suspendu: boolean
  notification_pref: NotifPref
  created_at: string
  updated_at: string
}

export interface TypeEtablissement {
  code: string
  nom: string
  ordre: number
}

export interface Etablissement {
  id: string
  code: string
  nom: string
  liste: boolean
  type_code: string | null
  photo_url: string | null
  est_organisateur: boolean
  est_lieu: boolean
  email: string | null
  adresse: string | null
  description: string | null
  telephone: string | null
  site_url: string | null
  horaires: string | null
  geocodage: string | null
  statut: string | null
  created_at: string
  updated_at: string
}

export interface Categorie {
  code: string
  nom: string
  icone_url: string | null
  ordre: number
}

export interface Post {
  id: string
  titre: string
  complement: string | null
  date_debut: string        // ISO date: '2026-07-14'
  heure: string | null      // texte libre: '22h', '12h30 à 14h'
  ordre_dans_journee: number | null
  date_fin: string | null
  categorie_code: string | null
  organisateur_id: string | null
  lieu_id: string | null
  publie: boolean
  mis_en_avant: boolean
  a_laffiche: boolean
  dans_agenda: boolean
  affiche_url: string | null
  inscription: boolean
  nb_inscriptions_max: number | null
  phare: boolean
  refuse: boolean
  message_admin: string | null
  nom_redacteur: string | null
  contact_redacteur: string | null
  auteur_id: string | null
  created_at: string
  updated_at: string
}

// Post enrichi avec les relations (pour l'agenda)
export interface PostWithRelations extends Post {
  organisateur: Pick<Etablissement, 'id' | 'nom' | 'photo_url'> | null
  lieu: Pick<Etablissement, 'id' | 'nom'> | null
  categorie: Pick<Categorie, 'code' | 'nom'> | null
}

export interface Inscription {
  id: string
  post_id: string
  nom: string
  prenom: string
  telephone: string
  compte_id: string | null
  created_at: string
}

export interface ObjetPerdu {
  id: string
  objet: string
  type: ObjetType
  date_evenement: string
  description: string | null
  lieu: string | null
  photo_url: string | null
  nom_declarant: string
  telephone: string | null
  contact: string | null
  retrouve: boolean
  compte_id: string | null
  created_at: string
  updated_at: string
}

export interface ThemeArticle {
  code: string
  nom: string
  ordre: number
}

export interface Article {
  id: string
  titre: string
  theme_code: string
  texte: string | null
  image_url: string | null
  publie: boolean
  lien_url: string | null
  ordre: number
  created_at: string
  updated_at: string
}

export interface ArticleMag {
  id: string
  titre: string
  chapeau: string | null
  auteur_id: string | null
  auteur_nom: string | null
  date_publication: string | null
  photo_principale_url: string | null
  corps: string | null
  tags: string[] | null
  publie: boolean
  created_at: string
  updated_at: string
}
