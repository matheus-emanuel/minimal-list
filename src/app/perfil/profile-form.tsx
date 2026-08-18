'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BadgeImage } from '@/components/badge-image'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from '@/lib/actions/profile'

export function ProfileForm({
  initialDisplayName,
  initialUsername,
  initialAvatarUrl,
  userId,
}: {
  initialDisplayName: string
  initialUsername: string
  initialAvatarUrl: string | null
  userId: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [username, setUsername] = useState(initialUsername)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    startTransition(async () => {
      let newAvatarUrl: string | undefined

      const file = fileInputRef.current?.files?.[0]
      if (file) {
        const supabase = createClient()
        const ext = file.name.split('.').pop() ?? 'jpg'
        const filePath = `${userId}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage.from('badges').upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })
        if (uploadError) {
          setError('Falha no upload da foto. Tente novamente.')
          return
        }
        newAvatarUrl = supabase.storage.from('badges').getPublicUrl(filePath).data.publicUrl
      }

      const result = await updateProfile({
        displayName,
        username,
        ...(newAvatarUrl && { avatarUrl: newAvatarUrl }),
      })

      if (result.error === 'username_taken') {
        setError('Esse nome de usuário já está em uso.')
        return
      }
      if (result.error) {
        setError('Não foi possível salvar. Tente novamente.')
        return
      }

      if (newAvatarUrl) setAvatarUrl(newAvatarUrl)
      setMessage('Perfil atualizado.')
      if (fileInputRef.current) fileInputRef.current.value = ''
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3">
        <BadgeImage src={avatarUrl} alt={displayName || 'Sua foto'} size={56} />
        <div className="flex-1">
          <Label htmlFor="avatar">Foto</Label>
          <input ref={fileInputRef} id="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block text-sm text-muted" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="displayName">Nome</Label>
        <Input id="displayName" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="username">Usuário público (minimal-list.app/u/{username || '...'})</Label>
        <Input
          id="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          pattern="[a-zA-Z0-9_-]+"
          minLength={3}
          maxLength={30}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-strong">{message}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  )
}
