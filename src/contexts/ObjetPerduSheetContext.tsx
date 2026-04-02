'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { ObjetPerdu } from '@/types/database'

interface ObjetPerduSheetContextValue {
  objet: ObjetPerdu | null
  isOpen: boolean
  refreshKey: number
  open:  (objet: ObjetPerdu) => void
  close: () => void
  updateObjet: (updated: ObjetPerdu) => void
  triggerRefresh: () => void
}

const ObjetPerduSheetContext = createContext<ObjetPerduSheetContextValue>({
  objet: null,
  isOpen: false,
  refreshKey: 0,
  open:  () => {},
  close: () => {},
  updateObjet: () => {},
  triggerRefresh: () => {},
})

export function ObjetPerduSheetProvider({ children }: { children: ReactNode }) {
  const [objet,      setObjet]      = useState<ObjetPerdu | null>(null)
  const [isOpen,     setIsOpen]     = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const open  = useCallback((o: ObjetPerdu) => { setObjet(o); setIsOpen(true)  }, [])
  const close = useCallback(() => { setIsOpen(false) }, [])

  // Met à jour l'objet courant localement + rafraîchit la liste
  const updateObjet = useCallback((updated: ObjetPerdu) => {
    setObjet(updated)
    setRefreshKey(k => k + 1)
  }, [])

  const triggerRefresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  return (
    <ObjetPerduSheetContext.Provider value={{ objet, isOpen, refreshKey, open, close, updateObjet, triggerRefresh }}>
      {children}
    </ObjetPerduSheetContext.Provider>
  )
}

export function useObjetPerduSheet() {
  return useContext(ObjetPerduSheetContext)
}
