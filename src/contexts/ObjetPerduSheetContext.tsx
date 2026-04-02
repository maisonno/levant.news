'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { ObjetPerdu } from '@/types/database'

interface ObjetPerduSheetContextValue {
  objet: ObjetPerdu | null
  isOpen: boolean
  open:  (objet: ObjetPerdu) => void
  close: () => void
  markRetrouve: (id: string) => void
}

const ObjetPerduSheetContext = createContext<ObjetPerduSheetContextValue>({
  objet: null,
  isOpen: false,
  open:  () => {},
  close: () => {},
  markRetrouve: () => {},
})

export function ObjetPerduSheetProvider({ children }: { children: ReactNode }) {
  const [objet,  setObjet]  = useState<ObjetPerdu | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const open  = useCallback((o: ObjetPerdu) => { setObjet(o); setIsOpen(true)  }, [])
  const close = useCallback(() => { setIsOpen(false) }, [])

  // Met à jour l'objet courant quand il est marqué retrouvé (depuis la sheet ou le profil)
  const markRetrouve = useCallback((id: string) => {
    setObjet(prev => prev?.id === id ? { ...prev, retrouve: true } : prev)
  }, [])

  return (
    <ObjetPerduSheetContext.Provider value={{ objet, isOpen, open, close, markRetrouve }}>
      {children}
    </ObjetPerduSheetContext.Provider>
  )
}

export function useObjetPerduSheet() {
  return useContext(ObjetPerduSheetContext)
}
