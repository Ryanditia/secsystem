import { count, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { FirstAdminForm } from '@/components/account-forms'
import { SignOutButton } from '@/components/sign-out-button'
import { getAppUser } from '@/lib/authz'
import { isNeonAuthConfigured } from '@/lib/auth-config'

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const current = await getAppUser()
  if (current) redirect(current.role === 'admin' ? '/admin' : '/supervisor')

  const [{ data: session }, [adminCount]] = await Promise.all([
    auth.getSession(),
    db.select({ value: count() }).from(user).where(eq(user.role, 'admin')),
  ])
  if (adminCount.value > 0) {
    return <SetupNotice message="Setup awal sudah selesai. Minta admin mengirim undangan ke email Anda." />
  }

  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase() ?? ''
  if (!initialAdminEmail || !isNeonAuthConfigured()) {
    return <SetupNotice message="Neon Auth atau email admin awal belum dikonfigurasi." />
  }

  if (session?.user) {
    if (session.user.email.trim().toLowerCase() !== initialAdminEmail) {
      return <SetupNotice message="Email ini bukan email admin awal yang terdaftar.">
        <SignOutButton />
      </SetupNotice>
    }
    if (!session.user.emailVerified) {
      return <SetupPageShell title="Verifikasi email admin" description={`Masukkan kode yang dikirim ke ${initialAdminEmail}.`}>
        <FirstAdminForm defaultEmail={initialAdminEmail} mode="verify" />
      </SetupPageShell>
    }
    return <SetupPageShell title="Aktifkan admin" description="Email admin sudah diverifikasi. Aktifkan akses ke portal SecSystem.">
      <FirstAdminForm defaultEmail={initialAdminEmail} mode="claim" />
    </SetupPageShell>
  }

  return <SetupPageShell title="Buat akun admin" description="Daftar memakai email admin yang terdaftar. Neon akan mengirim kode verifikasi ke email tersebut.">
    <FirstAdminForm defaultEmail={initialAdminEmail} mode="register" />
  </SetupPageShell>
}

function SetupPageShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080b0f] px-4 py-10 text-slate-100">
      <section className="w-full max-w-[460px] rounded-3xl border border-white/[0.08] bg-[#101419] p-6 shadow-2xl sm:p-8">
        <span className="flex size-11 items-center justify-center rounded-xl bg-lime-300 text-lg font-bold text-slate-950">S</span>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-lime-200">Setup satu kali</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-2 mb-6 text-sm leading-6 text-slate-500">{description}</p>
        {children}
      </section>
    </main>
  )
}

function SetupNotice({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <SetupPageShell title="Setup admin" description="Pengaturan akses SecSystem">
      <p role="status" className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-xs leading-5 text-amber-100">{message}</p>
      {children ? <div className="mt-3">{children}</div> : null}
    </SetupPageShell>
  )
}
