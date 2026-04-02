import { PostWithRelations } from '@/types/database'
import PostCard from './PostCard'

interface Props {
  posts: PostWithRelations[]
}

type Segment =
  | { type: 'phare'; card: PostWithRelations }
  | { type: 'group'; cards: PostWithRelations[] }

/**
 * Affiche une liste de PostCards :
 *
 * - Cartes PHARE   → carte standalone (image droite, texte droite, titre grand)
 *                    espacée de 10 px (space-y-2.5) de ses voisines
 * - Cartes normales consécutives → groupe iOS (conteneur arrondi + divide-y)
 *   • 1 seule carte  → PostCard individuel
 *   • N cartes       → conteneur rounded-2xl / divide-y / coins internes plats
 */
export default function PostCardList({ posts }: Props) {
  if (posts.length === 0) return null

  // Découper la liste en segments :
  // – une carte phare = segment isolé
  // – des cartes normales consécutives = un même groupe
  const segments: Segment[] = []
  for (const post of posts) {
    if (post.phare) {
      segments.push({ type: 'phare', card: post })
    } else {
      const last = segments[segments.length - 1]
      if (last?.type === 'group') {
        last.cards.push(post)
      } else {
        segments.push({ type: 'group', cards: [post] })
      }
    }
  }

  // Un seul segment non-phare → rendu direct (pas de wrapper space-y)
  if (segments.length === 1 && segments[0].type === 'group') {
    const cards = segments[0].cards
    if (cards.length === 1) return <PostCard post={cards[0]} />
    return (
      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-100">
        {cards.map(p => <PostCard key={p.id} post={p} grouped />)}
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {segments.map((seg, i) => {
        if (seg.type === 'phare') {
          return <PostCard key={seg.card.id} post={seg.card} />
        }
        const { cards } = seg
        if (cards.length === 1) {
          return <PostCard key={cards[0].id} post={cards[0]} />
        }
        return (
          <div key={i} className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-100">
            {cards.map(p => <PostCard key={p.id} post={p} grouped />)}
          </div>
        )
      })}
    </div>
  )
}
