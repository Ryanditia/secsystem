import { and, count, desc, eq } from 'drizzle-orm'
import { CalendarDays, ClipboardList, UsersRound } from 'lucide-react'
import { AdminReportTable, AdminVisitorTable } from '@/components/admin-tables'
import { GuardReportForm, VisitorEntryForm } from '@/components/admin-forms'
import { PortalHeader } from '@/components/portal-header'
import { SupervisorInvitationForm } from '@/components/account-forms'
import { requireAppUser } from '@/lib/authz'
import { db } from '@/lib/db'
import { guardReports, visitorRecords } from '@/lib/db/schema'
import { getJakartaDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const { error, updated } = await searchParams
  const current = await requireAppUser('admin')
  const today = getJakartaDate()
  const workspace = current.workspaceId

  const [[visitorCount], [reportCount], visitors, reports] = await Promise.all([
    db.select({ value: count() }).from(visitorRecords).where(and(eq(visitorRecords.userId, workspace), eq(visitorRecords.visitDate, today))),
    db.select({ value: count() }).from(guardReports).where(and(eq(guardReports.userId, workspace), eq(guardReports.reportDate, today))),
    db.select().from(visitorRecords).where(eq(visitorRecords.userId, workspace)).orderBy(desc(visitorRecords.visitDate), desc(visitorRecords.createdAt)).limit(8),
    db.select().from(guardReports).where(eq(guardReports.userId, workspace)).orderBy(desc(guardReports.reportDate), desc(guardReports.createdAt)).limit(6),
  ])
  const controlErrorMessages: Record<string, string> = {
    'invalid-control': 'Periksa kembali status kunjungan, visitor pass, dan waktu aktual.',
    'check-in-required': 'Isi jam check-in aktual untuk tamu yang sudah datang.',
    'check-out-required': 'Isi jam check-out aktual untuk kunjungan yang sudah selesai.',
    'record-not-found': 'Data tamu tidak ditemukan di workspace ini.',
  }
  const controlError = error ? controlErrorMessages[error] : undefined

  return (
    <main className="min-h-screen bg-[#080b0f] text-slate-100">
      <PortalHeader user={current} section="Kontrol tamu" />
      <div className="mx-auto max-w-[1480px] px-4 pb-12 pt-7 sm:px-7 lg:px-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lime-200">Portal admin</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Operasional keamanan</h1>
            <p className="mt-2 text-sm text-slate-500">Input kontrol tamu dan susun laporan tugas jaga harian.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400"><CalendarDays size={15} aria-hidden="true" /> {today}</div>
        </div>

        <section aria-label="Ringkasan hari ini" className="mt-6 grid gap-3 sm:grid-cols-2">
          <Metric icon={UsersRound} label="Kunjungan hari ini" value={visitorCount.value} note="Data tersimpan di workspace" />
          <Metric icon={ClipboardList} label="Laporan jaga hari ini" value={`${reportCount.value} / 12`} note="3 shift × 4 regu" />
        </section>

        <div className="mt-7 grid gap-6 xl:grid-cols-2">
          <section id="tamu" className="scroll-mt-6 rounded-2xl border border-white/[0.08] bg-[#101419] p-5 sm:p-6">
            <SectionTitle eyebrow="Buku tamu" title="Kontrol tamu harian" description="Catat identitas, waktu kunjungan, PIC, tujuan, induksi keselamatan, dan visitor pass." />
            <div className="mt-5"><VisitorEntryForm today={today} /></div>
          </section>
          <section id="laporan" className="scroll-mt-6 rounded-2xl border border-white/[0.08] bg-[#101419] p-5 sm:p-6">
            <SectionTitle eyebrow="Shift I–III · Regu A–D" title="Laporan tugas jaga" description="Lengkapi kehadiran, penempatan pos, kegiatan, inventaris, lembur, tamu/proyek, dan temuan." />
            <div className="mt-5"><GuardReportForm today={today} /></div>
          </section>
        </div>

        {controlError ? <p role="alert" className="mt-7 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-4 py-3 text-xs text-rose-200">{controlError}</p> : null}
        {updated === '1' ? <p role="status" className="mt-7 rounded-xl border border-lime-300/20 bg-lime-300/[0.06] px-4 py-3 text-xs text-lime-200">Status kunjungan dan visitor pass berhasil diperbarui.</p> : null}

        <section id="riwayat-tamu" className="mt-7 scroll-mt-6 rounded-2xl border border-white/[0.08] bg-[#101419] p-5 sm:p-6">
          <SectionTitle eyebrow="Data terbaru" title="Kontrol tamu tersimpan" description="Informasi kontak lengkap hanya tersedia di portal admin." />
          <div className="mt-4"><AdminVisitorTable visitors={visitors} /></div>
        </section>

        <section id="riwayat-laporan" className="mt-5 rounded-2xl border border-white/[0.08] bg-[#101419] p-5 sm:p-6">
          <SectionTitle eyebrow="Arsip shift" title="Laporan terbaru" description="Laporan unik per tanggal, shift, dan regu. Simpan ulang untuk memperbarui laporan yang sama." />
          <div className="mt-4"><AdminReportTable reports={reports} /></div>
        </section>

        <section id="akses" className="mt-5 scroll-mt-6 rounded-2xl border border-white/[0.08] bg-[#101419] p-5 sm:p-6">
          <SectionTitle eyebrow="Akses berbatas" title="Undang supervisor" description="Supervisor hanya dapat membaca ringkasan. Tautan undangan berlaku 7 hari dan hanya dapat digunakan sekali." />
          <div className="mt-4 max-w-xl"><SupervisorInvitationForm /></div>
        </section>
      </div>
    </main>
  )
}

function Metric({ icon: Icon, label, value, note }: { icon: typeof UsersRound; label: string; value: number | string; note: string }) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#101419] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p></div>
        <span className="flex size-9 items-center justify-center rounded-xl bg-lime-300/10 text-lime-200"><Icon size={17} aria-hidden="true" /></span>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{note}</p>
    </article>
  )
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime-200">{eyebrow}</p><h2 className="mt-2 text-lg font-semibold text-white">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>
}
