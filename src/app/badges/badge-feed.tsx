'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { toggleReaction, reportPost } from '@/lib/actions/badges'

type FeedPost = {
  id: string
  authorName: string
  courseTitle: string | null
  imageUrl: string
  caption: string | null
  createdAt: string
  likeCount: number
  likedByMe: boolean
}

export function BadgeFeed({
  posts,
  isAuthenticated,
}: {
  posts: FeedPost[]
  isAuthenticated: boolean
}) {
  return (
    <ul className="space-y-6">
      {posts.map((post) => (
        <BadgePostCard key={post.id} post={post} isAuthenticated={isAuthenticated} />
      ))}
      {posts.length === 0 && (
        <p className="text-sm text-slate-500">Nenhum badge compartilhado ainda.</p>
      )}
    </ul>
  )
}

function BadgePostCard({
  post,
  isAuthenticated,
}: {
  post: FeedPost
  isAuthenticated: boolean
}) {
  const [liked, setLiked] = useState(post.likedByMe)
  const [likeCount, setLikeCount] = useState(post.likeCount)
  const [reported, setReported] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleLike() {
    if (!isAuthenticated) return
    const nextLiked = !liked
    setLiked(nextLiked)
    setLikeCount((count) => count + (nextLiked ? 1 : -1))

    startTransition(async () => {
      const result = await toggleReaction(post.id, nextLiked)
      if (result.error) {
        setLiked((current) => !current)
        setLikeCount((count) => count + (nextLiked ? -1 : 1))
      }
    })
  }

  function handleReport() {
    if (!isAuthenticated || reported) return
    const reason = window.prompt('Por que você está denunciando este post?')
    if (!reason) return

    startTransition(async () => {
      const result = await reportPost({ postId: post.id, reason })
      if (!result.error) setReported(true)
    })
  }

  return (
    <li className="rounded border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
        <span>
          {post.authorName}
          {post.courseTitle && ` · ${post.courseTitle}`}
        </span>
        <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString('pt-BR')}</time>
      </div>
      <Image
        src={post.imageUrl}
        alt={post.caption ?? 'Foto do badge'}
        width={800}
        height={600}
        className="mb-2 h-auto max-h-96 w-full rounded object-contain"
      />
      {post.caption && <p className="mb-2 text-sm">{post.caption}</p>}
      <div className="flex items-center gap-4 text-sm">
        <button
          type="button"
          onClick={handleLike}
          disabled={!isAuthenticated || isPending}
          className={liked ? 'font-semibold text-blue-700' : 'text-slate-600'}
        >
          ❤ {likeCount}
        </button>
        <button
          type="button"
          onClick={handleReport}
          disabled={!isAuthenticated || isPending || reported}
          className="text-slate-400 hover:text-red-600"
        >
          {reported ? 'Denunciado' : 'Denunciar'}
        </button>
      </div>
    </li>
  )
}
