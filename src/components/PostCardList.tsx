import { PostWithRelations } from '@/types/database'
import PostCard from './PostCard'

interface Props {
  posts: PostWithRelations[]
}

/**
 * Affiche une liste de PostCards :
 * - 1 carte  → PostCard normal (coins arrondis, ombre, bordure individuels)
 * - N cartes → groupe iOS : conteneur arrondi unique, divide-y, coins internes plats
 */
export default function PostCardList({ posts }: Props) {
  if (posts.length === 0) return null

  if (posts.length === 1) {
    return <PostCard post={posts[0]} />
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-100">
      {posts.map(post => (
        <PostCard key={post.id} post={post} grouped />
      ))}
    </div>
  )
}
