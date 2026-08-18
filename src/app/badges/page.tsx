import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { BadgeFeed } from './badge-feed'

export default async function BadgesPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: entries } = await supabase
    .from('mural_entries')
    .select('id, user_id, course_id, storage_bucket, image_path, source, caption, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const userIds = [...new Set((entries ?? []).map((e) => e.user_id).filter((id): id is string => !!id))]
  const courseIds = [...new Set((entries ?? []).map((e) => e.course_id).filter((id): id is string => !!id))]

  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, display_name').in('id', userIds)
    : { data: [] as { id: string; display_name: string }[] }
  const { data: courses } = courseIds.length
    ? await supabase.from('courses').select('id, title').in('id', courseIds)
    : { data: [] as { id: string; title: string }[] }

  const displayNameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]))
  const courseTitleById = new Map((courses ?? []).map((c) => [c.id, c.title]))

  const postIds = (entries ?? []).filter((e) => e.source === 'manual' && e.id).map((e) => e.id as string)
  const { data: reactions } = postIds.length
    ? await supabase.from('badge_reactions').select('post_id, user_id').in('post_id', postIds)
    : { data: [] as { post_id: string; user_id: string }[] }

  const reactionsByPost = new Map<string, string[]>()
  for (const reaction of reactions ?? []) {
    const list = reactionsByPost.get(reaction.post_id) ?? []
    list.push(reaction.user_id)
    reactionsByPost.set(reaction.post_id, list)
  }

  const feedPosts = (entries ?? []).map((entry) => ({
    id: entry.id,
    authorName: (entry.user_id && displayNameById.get(entry.user_id)) ?? 'Usuário',
    courseTitle: (entry.course_id && courseTitleById.get(entry.course_id)) ?? null,
    imageUrl:
      entry.image_path && entry.storage_bucket
        ? supabase.storage.from(entry.storage_bucket).getPublicUrl(entry.image_path).data.publicUrl
        : null,
    isManual: entry.source === 'manual',
    caption: entry.caption,
    createdAt: entry.created_at,
    likeCount: entry.id ? (reactionsByPost.get(entry.id)?.length ?? 0) : 0,
    likedByMe: entry.id ? (reactionsByPost.get(entry.id) ?? []).includes(user.id) : false,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-strong">Mural de Badges</h1>
        <p className="mt-1 text-sm text-muted">
          Quando você conclui um treinamento, seu badge aparece aqui automaticamente.
        </p>
      </div>
      <BadgeFeed posts={feedPosts} isAuthenticated={!!user} />
    </div>
  )
}
