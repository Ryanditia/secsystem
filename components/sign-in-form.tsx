'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function SignInForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setError('')
    setPending(true)

    const result = await authClient.signIn.email({
      email: String(formData.get('email') ?? '').trim().toLowerCase(),
      password: String(formData.get('password') ?? ''),
    })

    setPending(false)
    if (result.error) {
      setError('Email atau kata sandi tidak cocok, atau email belum diverifikasi.')
      return
    }

    router.replace('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        Email
        <input name="email" type="email" autoComplete="username" required className="h-11 rounded-xl border border-white/10 bg-[#0a0d11] px-3 text-sm text-white outline-none transition focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/15" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        Kata sandi
        <input name="password" type="password" autoComplete="current-password" minLength={12} required className="h-11 rounded-xl border border-white/10 bg-[#0a0d11] px-3 text-sm text-white outline-none transition focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/15" />
      </label>
      {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
      <button type="submit" disabled={pending} className="mt-1 inline-flex h-11 items-center justify-center rounded-xl bg-lime-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-lime-200 disabled:cursor-wait disabled:opacity-60">
        {pending ? 'Memeriksa akun…' : 'Masuk ke dashboard'}
      </button>
    </form>
  )
}
