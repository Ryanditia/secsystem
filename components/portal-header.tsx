import Link from 'next/link'
import { Activity, ArrowUpRight, ClipboardList, LayoutDashboard, ShieldCheck, UsersRound } from 'lucide-react'
import type { AppUser } from '@/lib/authz'
import { SignOutButton } from '@/components/sign-out-button'

export function PortalHeader({ user, section }: { user: AppUser; section: string }) {
  const links = user.role === 'admin'
    ? [
        { href: '/admin#riwayat-tamu', label: 'Kontrol tamu', icon: UsersRound },
        { href: '/admin#laporan-ai', label: 'Laporan AI', icon: LayoutDashboard },
        { href: '/admin/rekap', label: 'Rekap Harian', icon: ClipboardList },
        { href: '/admin/soi', label: 'SOI', icon: Activity },
        { href: '/admin#akses', label: 'Akses supervisor', icon: ShieldCheck },
      ]
    : [
        { href: '/supervisor#ringkasan', label: 'Ringkasan', icon: LayoutDashboard },
        { href: '/supervisor#tamu', label: 'Kontrol tamu', icon: UsersRound },
        { href: '/supervisor#laporan', label: 'Laporan jaga', icon: ShieldCheck },
      ]

  return (
    <header className="border-b border-white/[0.07] bg-[#0b0f13]">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-4 sm:px-7 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime-300 text-slate-950"><ShieldCheck size={21} aria-hidden="true" /></span>
          <div className="min-w-0">
            <Link href={user.role === 'admin' ? '/admin' : '/supervisor'} className="text-sm font-semibold tracking-tight text-white">SecSystem</Link>
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">{user.role === 'admin' ? 'Portal Admin' : 'Portal Supervisor'}</p>
          </div>
        </div>
        <nav aria-label="Navigasi portal" className="hidden items-center gap-1 lg:flex">
          {links.map(({ href, label, icon: Icon }) => (
            <a key={href} href={href} aria-current={section === label ? 'page' : undefined} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition ${section === label ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'}`}>
              <Icon size={15} aria-hidden="true" />{label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2 border-l border-white/[0.08] pl-3 sm:pl-4">
          <span className="hidden max-w-40 truncate text-xs text-slate-400 sm:inline" title={user.email}>{user.name}</span>
          <span className="flex size-8 items-center justify-center rounded-full bg-[#26302a] text-[10px] font-semibold text-lime-200" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
          <SignOutButton />
        </div>
      </div>
      <nav aria-label="Navigasi seluler" className="flex gap-1 overflow-x-auto px-4 pb-3 lg:hidden">
        {links.map(({ href, label, icon: Icon }) => (
          <a key={href} href={href} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-2 text-[10px] text-slate-400 hover:text-white">
            <Icon size={13} aria-hidden="true" />{label}<ArrowUpRight size={11} aria-hidden="true" />
          </a>
        ))}
      </nav>
    </header>
  )
}
