'use client'

import { DrawerProvider } from '@/contexts/DrawerContext'
import { EventSheetProvider } from '@/contexts/EventSheetContext'
import DrawerMenu from '@/components/DrawerMenu'
import EventSheet from '@/components/EventSheet'
import FloatingBurger from '@/components/FloatingBurger'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <DrawerProvider>
      <EventSheetProvider>
        <DrawerMenu />
        <FloatingBurger />
        {children}
        <EventSheet />
      </EventSheetProvider>
    </DrawerProvider>
  )
}
