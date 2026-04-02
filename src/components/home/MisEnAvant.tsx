import { Post } from '@/types/database'

interface Props {
  post: Post
}

export default function MisEnAvant({ post }: Props) {
  return (
    <div className="mx-4 mt-4">
      <div
        className="rounded-2xl p-4 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #dc2626, #ea580c)' }}
      >
        {/* Icône d'alerte */}
        <div className="flex items-start gap-3">
          <div className="text-2xl flex-shrink-0 mt-0.5">⚠️</div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">
              Info importante
            </p>
            <p className="font-bold text-base leading-snug">{post.titre}</p>
            {post.complement && (
              <p className="text-sm text-white/80 mt-1 leading-relaxed">
                {post.complement.length > 120
                  ? post.complement.slice(0, 120) + '…'
                  : post.complement}
              </p>
            )}
            {post.heure && (
              <p className="text-xs text-white/70 mt-2 font-medium">
                🕐 {post.heure}
              </p>
            )}
          </div>
        </div>

        {/* Glow décoratif */}
        <div
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20"
          style={{ background: 'rgba(255,255,255,0.3)', filter: 'blur(20px)' }}
        />
      </div>
    </div>
  )
}
