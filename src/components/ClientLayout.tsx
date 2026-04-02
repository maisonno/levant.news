'use client'

import { DrawerProvider } from '@/contexts/DrawerContext'
import DrawerMenu from '@/components/DrawerMenu'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <DrawerProvider>
      <DrawerMenu />
      {children}
    </DrawerProvider>
  )
}
