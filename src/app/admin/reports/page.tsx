import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { deleteBadgePost } from '@/lib/actions/badges'

export default async function AdminReportsPage() {
  const supabase = await createServerClient()
  const { data: reports } = await supabase
    .from('badge_reports')
    .select('id, post_id, reason, resolved, created_at, badge_posts(caption)')
    .eq('resolved', false)
    .order('created_at', { ascending: false })

  async function resolveReport(reportId: string) {
    'use server'
    const supabase = await createServerClient()
    await supabase.from('badge_reports').update({ resolved: true }).eq('id', reportId)
    revalidatePath('/admin/reports')
  }

  async function removePost(reportId: string, postId: string) {
    'use server'
    await deleteBadgePost(postId)
    const supabase = await createServerClient()
    await supabase.from('badge_reports').update({ resolved: true }).eq('id', reportId)
    revalidatePath('/admin/reports')
    revalidatePath('/badges')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Denúncias Pendentes</h1>
      {(reports ?? []).length === 0 && (
        <p className="text-sm text-slate-500">Nenhuma denúncia pendente.</p>
      )}
      <ul className="space-y-3">
        {(reports ?? []).map((report) => (
          <li key={report.id} className="rounded border border-slate-200 bg-white p-3">
            <p className="text-sm">
              <strong>Motivo:</strong> {report.reason}
            </p>
            <p className="text-xs text-slate-500">
              Post: {report.badge_posts?.caption ?? '(sem legenda)'}
            </p>
            <div className="mt-2 flex gap-3 text-sm">
              <form action={resolveReport.bind(null, report.id)}>
                <button type="submit" className="text-slate-600">
                  Ignorar
                </button>
              </form>
              <form action={removePost.bind(null, report.id, report.post_id)}>
                <button type="submit" className="text-red-600">
                  Remover post
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
