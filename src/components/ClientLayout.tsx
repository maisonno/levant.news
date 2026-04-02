'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { DrawerProvider } from '@/contexts/DrawerContext'
import { EventSheetProvider } from '@/contexts/EventSheetContext'
import { EtabSheetProvider } from '@/contexts/EtabSheetContext'
import { ArticleSheetProvider } from '@/contexts/ArticleSheetContext'
import DrawerMenu from '@/components/DrawerMenu'
import EventSheet from '@/components/EventSheet'
import EtabSheet from '@/components/EtabSheet'
import ArticleSheet from '@/components/ArticleSheet'
import FloatingBurger from '@/components/FloatingBurger'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
    <DrawerProvider>
      <EventSheetProvider>
        <EtabSheetProvider>
          <ArticleSheetProvider>
            <DrawerMenu />
            <FloatingBurger />
            {children}
            <EventSheet />
            <EtabSheet />
            <ArticleSheet />
          </ArticleSheetProvider>
        </EtabSheetProvider>
      </EventSheetProvider>
    </DrawerProvider>
    </AuthProvider>
  )
}
