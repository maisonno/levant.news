'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { Etablissement } from '@/types/database'

interface EtabSheetContextType {
  etab: Etablissement | null
  isOpen: boolean
  open: (etab: Etablissement) => void
  close: () => void
}

const EtabSheetContext = createContext<EtabSheetContextType>({
  etab: null,
  isOpen: false,
  open: () => {},
  close: () => {},
})

export function EtabSheetProvider({ children }: { children: ReactNode }) {
  const [etab, setEtab] = useState<Etablissement | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const open = (e: Etablissement) => {
    setEtab(e)
    setIsOpen(true)
  }
  const close = () => setIsOpen(false)

  return (
    <EtabSheetContext.Provider value={{ etab, isOpen, open, close }}>
      {children}
    </EtabSheetContext.Provider>
  )
}

export function useEtabSheet() {
  return useContext(EtabSheetContext)
}
