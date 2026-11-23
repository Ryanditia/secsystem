import { and, eq, gt, isNull } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { supervisorInvitations } from '@/lib/db/schema'
import { hashInviteToken } from '@/lib/invitations'
import { getAppUser } from '@/lib/authz'
import { AcceptInvitationForm } from '@/components/account-forms'
import { SignOutButton } from '@/components/sign-out-button'
import { isNeonAuthConfigured } from '@/lib/auth-config'

export const dynamic = 'force-dynamic'

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams
  const current = await getAppUser()
  if (current) redirect(current.role === 'admin' ? '/admin' : '/supervisor')
  if (!isNeonAuthConfigured() || token.length < 32 || token.length > 128) return <InviteNotice message="Undangan tidak tersedia atau autentikasi belum aktif." />

  const [invite] = await db.select({ email: supervisorInvitations.email })
    .from(supervisorInvitations)
    .where(and(
      eq(supervisorInvitations.tokenHash, hashInviteToken(token)),
      isNull(supervisorInvitations.acceptedAt),
      gt(supervisorInvitations.expiresAt, new Date()),
    ))
    .limit(1)

  if (!invite) return <InviteNotice message="Undangan sudah dipakai atau kedaluwarsa. Minta admin mengirim undangan baru." />

  const { data: session } = await auth.getSession()
  const verifiedSession = session?.user?.emailVerified ? session.user : null
  const isMatchingEmail = verifiedSession?.email.trim().toLowerCase() === invite.email.trim().toLowerCase()

  if (verifiedSession && !isMatchingEmail) {
    return <InviteNotice message="Masuk dengan email yang menerima undangan ini, lalu buka kembali tautan undangan."><SignOutButton /></InviteNotice>
  }

  return (
    <AuthCard title="Undangan supervisor" description="Verifikasi email untuk mengaktifkan akses pemantauan read-only.">
      <AcceptInvitationForm token={token} email={invite.email} mode={isMatchingEmail ? 'claim' : 'register'} />
    </AuthCard>
  )
}

function AuthCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080b0f] px-4 py-10 text-slate-100">
      <section className="w-full max-w-[440px] rounded-3xl border border-white/[0.08] bg-[#101419] p-6 shadow-2xl sm:p-8">
        <span className="flex size-11 items-center justify-center rounded-xl bg-lime-300 text-lg font-bold text-slate-950">S</span>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-lime-200">SecSystem</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-2 mb-6 text-sm leading-6 text-slate-500">{description}</p>
        {children}
      </section>
    </main>
  )
}

function InviteNotice({ message, children }: { message: string; children?: React.ReactNode }) {
  return <AuthCard title="Undangan tidak tersedia" description={message}>{children ?? <a href="/sign-in" className="inline-flex h-10 items-center rounded-xl bg-lime-300 px-4 text-xs font-semibold text-slate-950">Kembali ke masuk</a>}</AuthCard>
}
