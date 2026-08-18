import { createServerClient } from '@/lib/supabase/server'
import { BadgeFeed } from './badge-feed'
import { BadgeUploadForm } from './badge-upload-form'

export default async function BadgesPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: posts } = await supabase
    .from('badge_posts')
    .select(
      'id, user_id, course_id, image_path, caption, created_at, profiles(display_name), courses(title)'
    )
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: reactions } = await supabase.from('badge_reactions').select('post_id, user_id')

  const { data: courses } = await supabase.from('courses').select('id, title').order('title')

  const reactionsByPost = new Map<string, string[]>()
  for (const reaction of reactions ?? []) {
    const list = reactionsByPost.get(reaction.post_id) ?? []
    list.push(reaction.user_id)
    reactionsByPost.set(reaction.post_id, list)
  }

  const feedPosts = (posts ?? []).map((post) => ({
    id: post.id,
    authorName: post.profiles?.display_name ?? 'Usuário',
    courseTitle: post.courses?.title ?? null,
    imageUrl: supabase.storage.from('badges').getPublicUrl(post.image_path).data.publicUrl,
    caption: post.caption,
    createdAt: post.created_at,
    likeCount: reactionsByPost.get(post.id)?.length ?? 0,
    likedByMe: user ? (reactionsByPost.get(post.id) ?? []).includes(user.id) : false,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mural de Badges</h1>
      {user ? (
        <BadgeUploadForm courses={courses ?? []} />
      ) : (
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          Entre na sua conta para compartilhar a foto do seu badge.
        </p>
      )}
      <BadgeFeed posts={feedPosts} isAuthenticated={!!user} />
    </div>
  )
}
