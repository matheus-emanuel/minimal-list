'use client'

import { useState, useTransition } from 'react'
import { toggleReaction, reportPost } from '@/lib/actions/badges'
import { BadgeImage } from '@/components/badge-image'

type FeedPost = {
  id: string | null
  authorName: string
  courseTitle: string | null
  imageUrl: string | null
  isManual: boolean
  caption: string | null
  createdAt: string | null
  likeCount: number
  likedByMe: boolean
}

export function BadgeFeed({ posts, isAuthenticated }: { posts: FeedPost[]; isAuthenticated: boolean }) {
  return (
    <ul className="space-y-6">
      {posts.map((post, index) => (
        <BadgePostCard key={post.id ?? `auto-${index}`} post={post} isAuthenticated={isAuthenticated} />
      ))}
      {posts.length === 0 && <p className="text-sm text-muted">Nenhum badge por aqui ainda.</p>}
    </ul>
  )
}

function BadgePostCard({ post, isAuthenticated }: { post: FeedPost; isAuthenticated: boolean }) {
  const [liked, setLiked] = useState(post.likedByMe)
  const [likeCount, setLikeCount] = useState(post.likeCount)
  const [reported, setReported] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleLike() {
    if (!isAuthenticated || !post.id) return
    const nextLiked = !liked
    setLiked(nextLiked)
    setLikeCount((count) => count + (nextLiked ? 1 : -1))

    startTransition(async () => {
      const result = await toggleReaction(post.id!, nextLiked)
      if (result.error) {
        setLiked((current) => !current)
        setLikeCount((count) => count + (nextLiked ? -1 : 1))
      }
    })
  }

  function handleReport() {
    if (!isAuthenticated || reported || !post.id) return
    const reason = window.prompt('Por que você está denunciando este post?')
    if (!reason) return

    startTransition(async () => {
      const result = await reportPost({ postId: post.id!, reason })
      if (!result.error) setReported(true)
    })
  }

  return (
    <li className="rounded-lg border border-border bg-subtle p-4">
      <div className="mb-2 flex items-center justify-between text-sm text-muted">
        <span>
          {post.authorName}
          {post.courseTitle && ` · ${post.courseTitle}`}
        </span>
        {post.createdAt && <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString('pt-BR')}</time>}
      </div>
      <div className="mb-2 flex justify-center">
        <BadgeImage src={post.imageUrl} alt={post.caption ?? post.courseTitle ?? 'Badge'} size={160} />
      </div>
      {post.caption && <p className="mb-2 text-sm text-body">{post.caption}</p>}
      {post.isManual && post.id && (
        <div className="flex items-center gap-4 text-sm">
          <button
            type="button"
            onClick={handleLike}
            disabled={!isAuthenticated || isPending}
            className={liked ? 'font-semibold text-strong' : 'text-muted'}
          >
            ♥ {likeCount}
          </button>
          <button
            type="button"
            onClick={handleReport}
            disabled={!isAuthenticated || isPending || reported}
            className="text-muted hover:text-danger"
          >
            {reported ? 'Denunciado' : 'Denunciar'}
          </button>
        </div>
      )}
    </li>
  )
}
