import TransportClient from './TransportClient'

type TabId = 'bateaux' | 'bus'
const VALID_TABS: TabId[] = ['bateaux', 'bus']

export default async function TransportPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params     = await searchParams
  const initialTab = VALID_TABS.includes(params?.tab as TabId)
    ? (params.tab as TabId)
    : 'bateaux'

  return <TransportClient initialTab={initialTab} />
}
