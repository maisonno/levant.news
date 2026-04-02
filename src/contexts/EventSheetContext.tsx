'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { PostWithRelations } from '@/types/database'

interface EventSheetContextValue {
  post: PostWithRelations | null
  isOpen: boolean
  open:  (post: PostWithRelations) => void
  close: () => void
}

const EventSheetContext = createContext<EventSheetContextValue>({
  post: null,
  isOpen: false,
  open:  () => {},
  close: () => {},
})

export function EventSheetProvider({ children }: { children: ReactNode }) {
  const [post,   setPost]   = useState<PostWithRelations | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const open  = useCallback((p: PostWithRelations) => { setPost(p); setIsOpen(true)  }, [])
  const close = useCallback(() => { setIsOpen(false) }, [])

  return (
    <EventSheetContext.Provider value={{ post, isOpen, open, close }}>
      {children}
    </EventSheetContext.Provider>
  )
}

export function useEventSheet() {
  return useContext(EventSheetContext)
}
