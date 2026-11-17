'use client'

import { useActionState } from 'react'
import { acceptSupervisorInvitation, createFirstAdmin, createSupervisorInvitation, type FormState } from '@/app/actions/accounts'

const emptyState: FormState = {}

function Feedback({ state }: { state: FormState }) {
  if (state.error) return <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-xs text-rose-200">{state.error}</p>
  if (state.success) return <p role="status" className="rounded-xl border border-lime-300/20 bg-lime-300/[0.06] px-3 py-2 text-xs text-lime-200">{state.success}</p>
  return null
}

function CredentialFields({ showToken = false, defaultEmail }: { showToken?: boolean; defaultEmail?: string }) {
  return (
    <>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-300">
        Nama lengkap
        <input name="name" autoComplete="name" required minLength={2} maxLength={100} className="h-11 rounded-xl border border-white/10 bg-[#0a0d11] px-3 text-sm text-white outline-none focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/15" />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-300">
        Email
        <input name="email" type="email" autoComplete="email" defaultValue={defaultEmail} required maxLength={254} className="h-11 rounded-xl border border-white/10 bg-[#0a0d11] px-3 text-sm text-white outline-none focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/15" />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-300">
        Kata sandi
        <input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} className="h-11 rounded-xl border border-white/10 bg-[#0a0d11] px-3 text-sm text-white outline-none focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/15" />
        <span className="text-[10px] font-normal text-slate-500">Minimal 12 karakter.</span>
      </label>
      {showToken ? (
        <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-300">
          Token setup satu kali
          <input name="setupToken" type="password" autoComplete="off" required className="h-11 rounded-xl border border-white/10 bg-[#0a0d11] px-3 text-sm text-white outline-none focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/15" />
        </label>
      ) : null}
    </>
  )
}

export function FirstAdminForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, action, pending] = useActionState(createFirstAdmin, emptyState)
  return (
    <form action={action} className="flex flex-col gap-4">
      <CredentialFields showToken defaultEmail={defaultEmail} />
      <Feedback state={state} />
      <button type="submit" disabled={pending} className="h-11 rounded-xl bg-lime-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-lime-200 disabled:opacity-60">
        {pending ? 'Menyiapkan akun…' : 'Buat akun admin'}
      </button>
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
      <button type="submit" disabled={pending} className="h-10 rounded-xl bg-lime-300 px-4 text-xs font-semibold text-slate-950 transition hover:bg-lime-200 disabled:opacity-60">
        {pending ? 'Membuat undangan…' : 'Buat undangan supervisor'}
      </button>
    </form>
  )
}

export function AcceptInvitationForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(acceptSupervisorInvitation, emptyState)
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />
      <p className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-xs text-slate-300">Undangan untuk <span className="font-medium text-white">{email}</span></p>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-300">
        Nama lengkap
        <input name="name" required minLength={2} maxLength={100} autoComplete="name" className="h-11 rounded-xl border border-white/10 bg-[#0a0d11] px-3 text-sm text-white outline-none focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/15" />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-300">
        Buat kata sandi
        <input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className="h-11 rounded-xl border border-white/10 bg-[#0a0d11] px-3 text-sm text-white outline-none focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/15" />
      </label>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className="h-11 rounded-xl bg-lime-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-lime-200 disabled:opacity-60">
        {pending ? 'Mengaktifkan akun…' : 'Terima undangan'}
      </button>
    </form>
  )
}
