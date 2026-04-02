'use client'

import { DrawerProvider } from '@/contexts/DrawerContext'
import { EventSheetProvider } from '@/contexts/EventSheetContext'
import { EtabSheetProvider } from '@/contexts/EtabSheetContext'
import DrawerMenu from '@/components/DrawerMenu'
import EventSheet from '@/components/EventSheet'
import EtabSheet from '@/components/EtabSheet'
import FloatingBurger from '@/components/FloatingBurger'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <DrawerProvider>
      <EventSheetProvider>
        <EtabSheetProvider>
          <DrawerMenu />
          <FloatingBurger />
          {children}
          <EventSheet />
          <EtabSheet />
        </EtabSheetProvider>
      </EventSheetProvider>
    </DrawerProvider>
  )
}
