'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { acceptSupervisorInvitation, claimFirstAdmin, createSupervisorInvitation, type FormState } from '@/app/actions/accounts'

const emptyState: FormState = {}

function Feedback({ state }: { state: FormState }) {
  if (state.error) return <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-xs text-rose-200">{state.error}</p>
  if (state.success) return <p role="status" className="rounded-xl border border-lime-300/20 bg-lime-300/[0.06] px-3 py-2 text-xs text-lime-200">{state.success}</p>
  return null
}

function EmailCodeForm({
  email,
  code,
  setCode,
  onSubmit,
  onResend,
  pending,
  error,
}: {
  email: string
  code: string
  setCode: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onResend: () => void
  pending: boolean
  error: string
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-xs leading-5 text-slate-300">Kode verifikasi dikirim ke <span className="font-medium text-white">{email}</span>. Masukkan 6 digit kode terbaru. Kode lama tidak berlaku setelah meminta ulang.</p>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-300">
        Kode verifikasi email
        <input name="otp" type="text" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} minLength={6} maxLength={6} required className="h-11 rounded-xl border border-white/10 bg-[#0a0d11] px-3 text-sm tracking-[0.2em] text-white outline-none focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/15" />
      </label>
      {error ? <p role="alert" className="text-xs text-rose-300">{error}</p> : null}
      <button type="submit" disabled={pending} className="h-11 rounded-xl bg-lime-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-lime-200 disabled:opacity-60">{pending ? 'Memverifikasi…' : 'Verifikasi email'}</button>
      <button type="button" onClick={onResend} disabled={pending} className="text-xs font-medium text-slate-400 underline-offset-4 hover:text-white hover:underline">Kirim ulang kode</button>
    </form>
  )
}

function Credentials({
  email,
  name,
  password,
  setName,
  setPassword,
  allowName,
}: {
  email: string
  name: string
  password: string
  setName: (value: string) => void
  setPassword: (value: string) => void
  allowName: boolean
}) {
  return (
    <>
      {allowName ? <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-300">Nama lengkap
        <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required minLength={2} maxLength={100} className="h-11 rounded-xl border border-white/10 bg-[#0a0d11] px-3 text-sm text-white outline-none focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/15" />
      </label> : null}
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-300">Email
        <input type="email" value={email} readOnly className="h-11 cursor-not-allowed rounded-xl border border-white/10 bg-[#0a0d11] px-3 text-sm text-white opacity-80 outline-none" />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-300">Kata sandi
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} maxLength={128} autoComplete={allowName ? 'new-password' : 'current-password'} className="h-11 rounded-xl border border-white/10 bg-[#0a0d11] px-3 text-sm text-white outline-none focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/15" />
        {allowName ? <span className="text-[10px] font-normal text-slate-500">Minimal 12 karakter.</span> : null}
      </label>
    </>
  )
}

export function FirstAdminForm({ defaultEmail, mode }: { defaultEmail: string; mode: 'register' | 'verify' | 'claim' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'credentials' | 'verify' | 'claim'>(mode === 'claim' ? 'claim' : mode === 'verify' ? 'verify' : 'credentials')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function finishClaim() {
    setPending(true)
    setError('')
    const result = await claimFirstAdmin()
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.replace('/admin')
    router.refresh()
  }

  async function submitCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    const { error: signUpError } = await authClient.signUp.email({ email: defaultEmail, password, name })
    setPending(false)
    if (signUpError) {
      setError('Pendaftaran belum berhasil. Jika akun pernah dibuat, masuk dengan email admin lalu buka setup kembali.')
      return
    }
    setStep('verify')
  }

  async function verifyEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = otp.trim()
    if (!/^\d{6}$/.test(code)) {
      setError('Masukkan 6 digit kode terbaru dari email.')
      return
    }

    setPending(true)
    setError('')
    let canClaim = false
    try {
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({ email: defaultEmail, otp: code })
      if (verifyError) {
        setError('Kode tidak cocok atau kedaluwarsa. Jika meminta ulang, gunakan kode terbaru.')
        return
      }
      const { data: session } = await authClient.getSession()
      if (!session?.user?.emailVerified) {
        setError('Email belum terverifikasi. Masuk kembali setelah verifikasi selesai.')
        return
      }
      canClaim = true
    } catch {
      setError('Verifikasi belum berhasil. Kode mungkin kedaluwarsa atau sudah diganti; kirim ulang kode terbaru.')
    } finally {
      setPending(false)
    }

    if (canClaim) await finishClaim()
  }

  async function resendCode() {
    setPending(true)
    setError('')
    setOtp('')
    try {
      const { error: resendError } = await authClient.emailOtp.sendVerificationOtp({ email: defaultEmail, type: 'email-verification' })
      if (resendError) {
        setError('Kode belum dapat dikirim ulang. Pastikan pendaftaran email sudah dimulai.')
        return
      }
      setStep('verify')
    } catch {
      setError('Kode belum dapat dikirim ulang. Coba lagi beberapa saat.')
    } finally {
      setPending(false)
    }
  }

  if (step === 'claim') {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl border border-lime-300/20 bg-lime-300/[0.06] px-3 py-2.5 text-xs leading-5 text-lime-100">Email sudah terverifikasi. Aktifkan akses admin untuk workspace ini.</p>
        {error ? <p role="alert" className="text-xs text-rose-300">{error}</p> : null}
        <button type="button" onClick={finishClaim} disabled={pending} className="h-11 rounded-xl bg-lime-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-lime-200 disabled:opacity-60">{pending ? 'Mengaktifkan…' : 'Aktifkan akun admin'}</button>
      </div>
    )
  }

  if (step === 'verify') {
    return <EmailCodeForm email={defaultEmail} code={otp} setCode={setOtp} onSubmit={verifyEmail} onResend={resendCode} pending={pending} error={error} />
  }

  return (
    <form onSubmit={submitCredentials} className="flex flex-col gap-4">
      <Credentials email={defaultEmail} name={name} password={password} setName={setName} setPassword={setPassword} allowName />
      {error ? <p role="alert" className="text-xs text-rose-300">{error}</p> : null}
      <button type="submit" disabled={pending} className="h-11 rounded-xl bg-lime-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-lime-200 disabled:opacity-60">{pending ? 'Mengirim kode…' : 'Kirim kode verifikasi'}</button>
      <button type="button" onClick={resendCode} disabled={pending} className="text-xs font-medium text-slate-400 underline-offset-4 hover:text-white hover:underline">Sudah daftar? Kirim ulang kode</button>
      <Link href="/sign-in" className="text-center text-xs font-medium text-slate-400 underline-offset-4 hover:text-white hover:underline">Sudah punya akun? Masuk</Link>
      <p className="text-center text-[10px] leading-5 text-slate-600">Kode dikirim oleh Neon Auth. Verifikasi email diperlukan sebelum admin dapat mengakses data.</p>
    </form>
  )
}

export function SupervisorInvitationForm() {
  const [state, action, pending] = useActionState(createSupervisorInvitation, emptyState)
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-300">
        Email supervisor
        <input name="email" type="email" required maxLength={254} autoComplete="email" className="h-10 rounded-xl border border-white/10 bg-[#0a0d11] px-3 text-sm text-white outline-none focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/15" />
      </label>
      <Feedback state={state} />
      {state.inviteUrl ? (
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-300">
          Tautan undangan (berlaku 7 hari, satu kali pakai)
          <input readOnly value={state.inviteUrl} onFocus={(event) => event.currentTarget.select()} className="h-10 w-full rounded-xl border border-white/10 bg-[#0a0d11] px-3 text-xs text-lime-100 outline-none" />
        </label>
      ) : null}
      <button type="submit" disabled={pending} className="h-10 rounded-xl bg-lime-300 px-4 text-xs font-semibold text-slate-950 transition hover:bg-lime-200 disabled:opacity-60">{pending ? 'Membuat undangan…' : 'Buat undangan supervisor'}</button>
    </form>
  )
}

export function AcceptInvitationForm({ token, email, mode }: { token: string; email: string; mode: 'register' | 'claim' }) {
  const router = useRouter()
  const [authMode, setAuthMode] = useState<'sign-up' | 'sign-in'>('sign-up')
  const [step, setStep] = useState<'credentials' | 'verify' | 'claim'>(mode === 'claim' ? 'claim' : 'credentials')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function finishClaim() {
    setPending(true)
    setError('')
    const result = await acceptSupervisorInvitation(token)
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.replace('/supervisor')
    router.refresh()
  }

  async function submitCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')

    if (authMode === 'sign-up') {
      const { error: signUpError } = await authClient.signUp.email({ email, password, name })
      setPending(false)
      if (signUpError) {
        setError('Pendaftaran belum berhasil. Jika sudah memiliki akun, pilih Masuk.')
        return
      }
      setStep('verify')
      return
    }

    const { error: signInError } = await authClient.signIn.email({ email, password })
    setPending(false)
    if (signInError) {
      setError('Email atau kata sandi tidak cocok, atau email belum diverifikasi.')
      return
    }
    await finishClaim()
  }

  async function verifyEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = otp.trim()
    if (!/^\d{6}$/.test(code)) {
      setError('Masukkan 6 digit kode terbaru dari email.')
      return
    }

    setPending(true)
    setError('')
    let canClaim = false
    try {
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({ email, otp: code })
      if (verifyError) {
        setError('Kode tidak cocok atau kedaluwarsa. Jika meminta ulang, gunakan kode terbaru.')
        return
      }
      const { data: session } = await authClient.getSession()
      if (!session?.user?.emailVerified) {
        setError('Email belum terverifikasi. Masuk kembali setelah verifikasi selesai.')
        return
      }
      canClaim = true
    } catch {
      setError('Verifikasi belum berhasil. Kode mungkin kedaluwarsa atau sudah diganti; kirim ulang kode terbaru.')
    } finally {
      setPending(false)
    }

    if (canClaim) await finishClaim()
  }

  async function resendCode() {
    setPending(true)
    setError('')
    setOtp('')
    try {
      const { error: resendError } = await authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' })
      if (resendError) setError('Kode baru belum dapat dikirim. Coba lagi beberapa saat.')
    } catch {
      setError('Kode baru belum dapat dikirim. Coba lagi beberapa saat.')
    } finally {
      setPending(false)
    }
  }

  if (step === 'claim') {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl border border-lime-300/20 bg-lime-300/[0.06] px-3 py-2.5 text-xs leading-5 text-lime-100">Email supervisor terverifikasi. Aktifkan akses read-only.</p>
        {error ? <p role="alert" className="text-xs text-rose-300">{error}</p> : null}
        <button type="button" onClick={finishClaim} disabled={pending} className="h-11 rounded-xl bg-lime-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-lime-200 disabled:opacity-60">{pending ? 'Mengaktifkan…' : 'Terima undangan'}</button>
      </div>
    )
  }

  if (step === 'verify') {
    return <EmailCodeForm email={email} code={otp} setCode={setOtp} onSubmit={verifyEmail} onResend={resendCode} pending={pending} error={error} />
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submitCredentials} className="flex flex-col gap-4">
        <Credentials email={email} name={name} password={password} setName={setName} setPassword={setPassword} allowName={authMode === 'sign-up'} />
        {error ? <p role="alert" className="text-xs text-rose-300">{error}</p> : null}
        <button type="submit" disabled={pending} className="h-11 rounded-xl bg-lime-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-lime-200 disabled:opacity-60">{pending ? 'Memproses…' : authMode === 'sign-up' ? 'Kirim kode verifikasi' : 'Masuk dan terima undangan'}</button>
      </form>
      {authMode === 'sign-up' || error ? <button type="button" onClick={resendCode} disabled={pending} className="text-xs font-medium text-slate-400 underline-offset-4 hover:text-white hover:underline">Sudah daftar? Kirim ulang kode verifikasi</button> : null}
      <button type="button" onClick={() => { setError(''); setAuthMode(authMode === 'sign-up' ? 'sign-in' : 'sign-up') }} className="text-xs font-medium text-slate-400 underline-offset-4 hover:text-white hover:underline">{authMode === 'sign-up' ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}</button>
    </div>
  )
}
