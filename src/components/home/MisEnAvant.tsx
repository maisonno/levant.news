import { Post } from '@/types/database'
import PostCard from '@/components/PostCard'
import { PostWithRelations } from '@/types/database'

interface Props {
  posts: PostWithRelations[]
}

export default function MisEnAvant({ posts }: Props) {
  if (posts.length === 0) return null

  return (
    <div className="mx-4 mt-4 space-y-2">
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
