import { and, eq, gt, isNull } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { supervisorInvitations } from '@/lib/db/schema'
import { hashInviteToken } from '@/lib/invitations'
import { AcceptInvitationForm } from '@/components/account-forms'

export const dynamic = 'force-dynamic'

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/')

  if (token.length < 32 || token.length > 128) {
    return <InvalidInvitation />
  }

  const [invite] = await db.select({ email: supervisorInvitations.email })
    .from(supervisorInvitations)
    .where(and(
      eq(supervisorInvitations.tokenHash, hashInviteToken(token)),
      isNull(supervisorInvitations.acceptedAt),
      gt(supervisorInvitations.expiresAt, new Date()),
    ))
    .limit(1)

  if (!invite) return <InvalidInvitation />

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080b0f] px-4 py-10 text-slate-100">
      <section className="w-full max-w-[440px] rounded-3xl border border-white/[0.08] bg-[#101419] p-6 shadow-2xl sm:p-8">
        <span className="flex size-11 items-center justify-center rounded-xl bg-lime-300 text-lg font-bold text-slate-950">S</span>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-lime-200">Undangan supervisor</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Aktifkan akun</h1>
        <p className="mt-2 mb-6 text-sm leading-6 text-slate-500">Buat nama dan kata sandi untuk mengakses laporan secara read-only.</p>
        <AcceptInvitationForm token={token} email={invite.email} />
      </section>
    </main>
  )
}

function InvalidInvitation() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080b0f] px-4 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#101419] p-7 text-center">
        <h1 className="text-xl font-semibold text-white">Undangan tidak tersedia</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Tautan mungkin sudah digunakan atau kedaluwarsa. Minta admin mengirim undangan baru.</p>
        <a href="/sign-in" className="mt-5 inline-flex h-10 items-center rounded-xl bg-lime-300 px-4 text-xs font-semibold text-slate-950">Kembali ke masuk</a>
      </section>
    </main>
  )
}
