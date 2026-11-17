'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function SignOutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleSignOut() {
    setPending(true)
    await authClient.signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  return (
    <button type="button" onClick={handleSignOut} disabled={pending} className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50">
      {pending ? 'Keluar…' : 'Keluar'}
    </button>
  )
}
