'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { DrawerProvider } from '@/contexts/DrawerContext'
import { EventSheetProvider } from '@/contexts/EventSheetContext'
import { EtabSheetProvider } from '@/contexts/EtabSheetContext'
import { ArticleSheetProvider } from '@/contexts/ArticleSheetContext'
import { ObjetPerduSheetProvider } from '@/contexts/ObjetPerduSheetContext'
import DrawerMenu from '@/components/DrawerMenu'
import EventSheet from '@/components/EventSheet'
import EtabSheet from '@/components/EtabSheet'
import ArticleSheet from '@/components/ArticleSheet'
import ObjetPerduSheet from '@/components/ObjetPerduSheet'
import FloatingBurger from '@/components/FloatingBurger'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
    <DrawerProvider>
      <EventSheetProvider>
        <EtabSheetProvider>
          <ArticleSheetProvider>
            <ObjetPerduSheetProvider>

              {/*
               * Layout responsive :
               *   Mobile  → colonne unique max-w-430px centrée (DrawerMenu en fixed overlay)
               *   Desktop → flex-row : sidebar 256px + contenu principal
               */}
              <div className="md:flex md:min-h-screen">

                <DrawerMenu />

                <main className="flex-1 min-w-0">
                  {/* Mobile : centré max-w-430 / Desktop : pleine largeur */}
                  <div
                    className="max-w-[430px] mx-auto md:max-w-none md:mx-0 min-h-screen bg-gray-100 relative"
                    style={{ overflowX: 'clip' }}
                  >
                    <FloatingBurger />
                    {children}
                    <EventSheet />
                    <EtabSheet />
                    <ArticleSheet />
                    <ObjetPerduSheet />
                  </div>
                </main>

              </div>

            </ObjetPerduSheetProvider>
          </ArticleSheetProvider>
        </EtabSheetProvider>
      </EventSheetProvider>
    </DrawerProvider>
    </AuthProvider>
  )
}
