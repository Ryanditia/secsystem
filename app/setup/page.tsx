import { count, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { FirstAdminForm } from '@/components/account-forms'
import { isAuthSecretStrong, isStrongSecret } from '@/lib/auth-config'

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/sign-in?notice=invitation-required')

  const [adminCount] = await db.select({ value: count() }).from(user).where(eq(user.role, 'admin'))
  if (adminCount.value > 0) redirect('/sign-in')

  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim() ?? ''
  const setupToken = process.env.INITIAL_ADMIN_SETUP_TOKEN
  const setupConfigured = Boolean(initialAdminEmail && isStrongSecret(setupToken) && isAuthSecretStrong())

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080b0f] px-4 py-10 text-slate-100">
      <section className="w-full max-w-[460px] rounded-3xl border border-white/[0.08] bg-[#101419] p-6 shadow-2xl sm:p-8">
        <span className="flex size-11 items-center justify-center rounded-xl bg-lime-300 text-lg font-bold text-slate-950">S</span>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-lime-200">Setup satu kali</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Buat akun admin</h1>
        <p className="mt-2 mb-6 text-sm leading-6 text-slate-500">Akun ini menjadi pemilik workspace SecSystem. Token setup hanya digunakan sekali.</p>
        {setupConfigured ? (
          <FirstAdminForm defaultEmail={initialAdminEmail} />
        ) : (
          <p role="alert" className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-sm text-amber-100">Konfigurasi setup admin belum aman atau belum lengkap. Periksa nilai awal admin, token setup, dan BETTER_AUTH_SECRET di Settings → Vars.</p>
        )}
      </section>
    </main>
  )
}
