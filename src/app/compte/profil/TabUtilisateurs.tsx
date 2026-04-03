'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Role, Etablissement } from '@/types/database'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface UserWithEtabs extends Profile {
  etablissements?: Pick<Etablissement, 'id' | 'nom'>[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<Role, { label: string; color: string }> = {
  user:      { label: 'Utilisateur',  color: 'bg-gray-100 text-gray-600'    },
  pro:       { label: 'Pro',          color: 'bg-amber-100 text-amber-700'  },
  compagnie: { label: 'Compagnie',    color: 'bg-blue-100 text-blue-700'    },
  admin:     { label: 'Admin',        color: 'bg-purple-100 text-purple-700' },
}

function RoleBadge({ role }: { role: Role }) {
  const { label, color } = ROLE_CONFIG[role] ?? ROLE_CONFIG.user
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Slide-in : panneau de gestion d'un utilisateur ───────────────────────────

interface UserPanelProps {
  user: UserWithEtabs
  allEtabs: Etablissement[]
  onClose: () => void
  onUpdated: (updated: UserWithEtabs) => void
}

function UserPanel({ user, allEtabs, onClose, onUpdated }: UserPanelProps) {
  const supabase = createClient()

  const [prenom,    setPrenom]    = useState(user.prenom)
  const [nom,       setNom]       = useState(user.nom)
  const [telephone, setTelephone] = useState(user.telephone ?? '')
  const [role,      setRole]      = useState<Role>(user.role)
  const [suspendu,  setSuspendu]  = useState(user.suspendu)
  const [linkedIds, setLinkedIds] = useState<string[]>(
    user.etablissements?.map(e => e.id) ?? []
  )
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [etabSearch, setEtabSearch] = useState('')

  async function saveProfile() {
    setSaving(true)
    await supabase.from('profiles')
      .update({ prenom, nom, telephone: telephone || null, role, suspendu })
      .eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onUpdated({ ...user, prenom, nom, telephone: telephone || null, role, suspendu })
  }

  async function toggleEtab(etabId: string) {
    if (linkedIds.includes(etabId)) {
      await supabase.from('compte_etablissements')
        .delete()
        .eq('user_id', user.id)
        .eq('etablissement_id', etabId)
      setLinkedIds(prev => prev.filter(id => id !== etabId))
    } else {
      await supabase.from('compte_etablissements')
        .insert({ user_id: user.id, etablissement_id: etabId })
      setLinkedIds(prev => [...prev, etabId])
    }
  }

  const filteredEtabs = allEtabs.filter(e =>
    e.nom.toLowerCase().includes(etabSearch.toLowerCase())
  )

  const field = "w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400"

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col md:left-64">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-extrabold text-gray-900">{user.prenom} {user.nom}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Membre depuis {fmtDate(user.created_at)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Infos de base */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Informations</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Prénom</label>
                  <input value={prenom} onChange={e => setPrenom(e.target.value)} className={field} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Nom</label>
                  <input value={nom} onChange={e => setNom(e.target.value)} className={field} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Téléphone</label>
                <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} className={field} />
              </div>
            </div>
          </section>

          {/* Profil & statut */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Profil & Statut</p>
            <div className="space-y-2">
              {/* Rôle */}
              <div className="grid grid-cols-2 gap-2">
                {(['user','pro','compagnie','admin'] as Role[]).map(r => (
                  <button key={r} onClick={() => setRole(r)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold text-left ${
                      role === r
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-500'
                    }`}>
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      role === r ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`}>
                      {role === r && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                    </span>
                    {ROLE_CONFIG[r].label}
                  </button>
                ))}
              </div>
              {/* Suspension */}
              <button onClick={() => setSuspendu(v => !v)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold ${
                  suspendu
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}>
                <span className="text-xl">{suspendu ? '🔒' : '✅'}</span>
                <span>{suspendu ? 'Compte suspendu' : 'Compte actif'}</span>
                <span className="ml-auto text-xs text-gray-400">Basculer</span>
              </button>
            </div>
          </section>

          {/* Établissements liés */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              Établissements liés
              {linkedIds.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full normal-case font-bold">
                  {linkedIds.length}
                </span>
              )}
            </p>
            <input
              value={etabSearch}
              onChange={e => setEtabSearch(e.target.value)}
              placeholder="Filtrer les établissements…"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none mb-2"
            />
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {filteredEtabs.map(e => {
                const linked = linkedIds.includes(e.id)
                return (
                  <button key={e.id} onClick={() => toggleEtab(e.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm text-left transition-colors ${
                      linked
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      linked ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`}>
                      {linked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    <span className={`flex-1 font-medium ${linked ? 'text-blue-700' : 'text-gray-700'}`}>
                      {e.nom}
                    </span>
                    {e.type_code && (
                      <span className="text-[10px] text-gray-400">{e.type_code}</span>
                    )}
                  </button>
                )
              })}
              {filteredEtabs.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucun établissement trouvé</p>
              )}
            </div>
          </section>

          {/* Bouton enregistrer */}
          <button onClick={saveProfile} disabled={saving}
            className="w-full py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50">
            {saved ? '✓ Enregistré' : saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function TabUtilisateurs() {
  const supabase = createClient()

  const [users,    setUsers]    = useState<UserWithEtabs[]>([])
  const [allEtabs, setAllEtabs] = useState<Etablissement[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filterRole,   setFilterRole]   = useState<Role | ''>('')
  const [filterStatut, setFilterStatut] = useState<'actif' | 'suspendu' | ''>('')
  const [selected, setSelected] = useState<UserWithEtabs | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [profRes, etabRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('etablissements').select('id, nom, type_code').order('nom'),
    ])

    if (etabRes.data) setAllEtabs(etabRes.data as Etablissement[])

    if (profRes.data) {
      // Charger les établissements liés pour chaque user
      const ids = profRes.data.map(p => p.id)
      const { data: links } = await supabase
        .from('compte_etablissements')
        .select('user_id, etablissement_id, etablissements(id, nom)')
        .in('user_id', ids)

      const etabsByUser = new Map<string, Pick<Etablissement, 'id' | 'nom'>[]>()
      for (const link of links ?? []) {
        const etab = (link as any).etablissements
        if (!etabsByUser.has(link.user_id)) etabsByUser.set(link.user_id, [])
        if (etab) etabsByUser.get(link.user_id)!.push(etab)
      }

      setUsers(profRes.data.map(p => ({
        ...p,
        etablissements: etabsByUser.get(p.id) ?? [],
      })))
    }
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u => {
    if (filterRole   && u.role !== filterRole)           return false
    if (filterStatut === 'actif'    && u.suspendu)       return false
    if (filterStatut === 'suspendu' && !u.suspendu)      return false
    if (!search) return true
    const q = search.toLowerCase()
    return `${u.prenom} ${u.nom}`.toLowerCase().includes(q)
  })

  function handleUpdated(updated: UserWithEtabs) {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
    setSelected(updated)
  }

  return (
    <div className="pb-10">
      {/* Barre de recherche */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Chercher un utilisateur…"
              className="w-full bg-gray-50 rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none border border-gray-200"
            />
          </div>
        </div>
        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {/* Filtre rôle */}
          {(['', 'user', 'pro', 'compagnie', 'admin'] as const).map(r => (
            <button key={r} onClick={() => setFilterRole(r)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filterRole === r
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}>
              {r === '' ? 'Tous les rôles' : ROLE_CONFIG[r].label}
            </button>
          ))}
          <div className="w-px bg-gray-200 flex-shrink-0" />
          {(['', 'actif', 'suspendu'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatut(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filterStatut === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}>
              {s === '' ? 'Tous' : s === 'actif' ? '✅ Actif' : '🔒 Suspendu'}
            </button>
          ))}
        </div>
      </div>

      {/* Compteur */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs text-gray-400">
          {loading ? 'Chargement…' : `${filtered.length} utilisateur${filtered.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Liste */}
      <div className="px-4 space-y-2 pt-2">
        {loading && (
          <p className="text-center text-gray-400 text-sm py-8">Chargement…</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">Aucun utilisateur trouvé.</p>
        )}
        {filtered.map(u => (
          <button key={u.id} onClick={() => setSelected(u)}
            className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:border-blue-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-extrabold flex-shrink-0 ${
                u.suspendu ? 'bg-gray-200 text-gray-400' : 'bg-blue-100 text-blue-700'
              }`}>
                {(u.prenom || '?').charAt(0).toUpperCase()}
              </div>
              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-bold text-sm ${u.suspendu ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {u.prenom} {u.nom}
                  </p>
                  <RoleBadge role={u.role} />
                  {u.suspendu && (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                      Suspendu
                    </span>
                  )}
                </div>
                {u.etablissements && u.etablissements.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    🏪 {u.etablissements.map(e => e.nom).join(', ')}
                  </p>
                )}
                <p className="text-[10px] text-gray-300 mt-0.5">Membre depuis {fmtDate(u.created_at)}</p>
              </div>
              {/* Chevron */}
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="text-gray-300 flex-shrink-0">
                <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Panneau slide-in utilisateur */}
      {selected && (
        <UserPanel
          user={selected}
          allEtabs={allEtabs}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}
