import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getAppUser } from '@/lib/authz'
import { SignInForm } from '@/components/sign-in-form'
import { SignOutButton } from '@/components/sign-out-button'
import { isNeonAuthConfigured } from '@/lib/auth-config'

export const dynamic = 'force-dynamic'

export default async function SignInPage() {
  const current = await getAppUser()
  if (current) redirect(current.role === 'admin' ? '/admin' : '/supervisor')
  const { data: session } = await auth.getSession()
  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase()

  if (session?.user?.emailVerified && initialAdminEmail && session.user.email.toLowerCase() === initialAdminEmail) {
    redirect('/setup')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080b0f] px-4 py-10 text-slate-100">
      <section className="w-full max-w-[420px] rounded-3xl border border-white/[0.08] bg-[#101419] p-6 shadow-2xl sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-lime-300 text-sm font-bold text-slate-950">S</span>
          <div><p className="text-sm font-semibold text-white">SecSystem</p><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Security operations</p></div>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lime-200">Akses terbatas</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Masuk ke portal</h1>
        <p className="mt-2 mb-6 text-sm leading-6 text-slate-500">Gunakan akun terverifikasi yang sudah memiliki akses workspace.</p>
        {!isNeonAuthConfigured() ? (
          <p role="alert" className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-xs leading-5 text-amber-100">Neon Auth belum siap. Pastikan Neon Auth aktif pada project ini.</p>
        ) : session?.user ? (
          <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
            <p className="text-xs leading-5 text-amber-100">Email ini belum memiliki akses workspace. Supervisor harus menerima undangan admin sebelum masuk.</p>
            <div className="mt-2"><SignOutButton /></div>
          </div>
        ) : <SignInForm />}
        <div className="mt-5 flex flex-col items-center gap-2 text-center text-[10px] leading-5 text-slate-600">
          <p>Supervisor mendaftar melalui tautan undangan admin. Verifikasi email diwajibkan.</p>
          <Link href="/setup" className="font-medium text-lime-200 underline-offset-4 hover:underline">Setup admin pertama</Link>
        </div>
      </section>
    </main>
  )
}
