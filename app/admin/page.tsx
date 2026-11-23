import { and, count, desc, eq, ne } from 'drizzle-orm'
import { CalendarDays, ClipboardList, IdCard, UsersRound } from 'lucide-react'
import { AiReportTable } from '@/components/ai-report-table'
import { AdminReportTable, AdminVisitorTable } from '@/components/admin-tables'
import { AiReportWorkspace } from '@/components/ai-report-workspace'
import { ReportAnalytics } from '@/components/report-analytics'
import { PortalHeader } from '@/components/portal-header'
import { SupervisorInvitationForm } from '@/components/account-forms'
import { requireAppUser } from '@/lib/authz'
import { db } from '@/lib/db'
import { aiGuardReports, employeeIdCardIncidents, guardReports, visitorRecords } from '@/lib/db/schema'
import { getJakartaDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const { error, updated } = await searchParams
  const current = await requireAppUser('admin')
  const today = getJakartaDate()
  const workspace = current.workspaceId

  const [[visitorCount], [reportCount], visitors, reports, incidents, legacyReports] = await Promise.all([
    db.select({ value: count() }).from(visitorRecords).where(and(eq(visitorRecords.userId, workspace), eq(visitorRecords.visitDate, today))),
    db.select({ value: count() }).from(aiGuardReports).where(and(eq(aiGuardReports.userId, workspace), eq(aiGuardReports.reportDate, today), ne(aiGuardReports.reportType, 'id-card'))),
    db.select().from(visitorRecords).where(eq(visitorRecords.userId, workspace)).orderBy(desc(visitorRecords.visitDate), desc(visitorRecords.createdAt)).limit(8),
    db.select().from(aiGuardReports).where(eq(aiGuardReports.userId, workspace)).orderBy(desc(aiGuardReports.reportDate), desc(aiGuardReports.createdAt)).limit(30),
    db.select().from(employeeIdCardIncidents).where(eq(employeeIdCardIncidents.userId, workspace)).orderBy(desc(employeeIdCardIncidents.reportDate), desc(employeeIdCardIncidents.createdAt)).limit(50),
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
            <p className="mt-2 text-sm text-slate-500">Pantau arsip tamu dan susun laporan jaga lewat percakapan dengan AI.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400"><CalendarDays size={15} aria-hidden="true" /> {today}</div>
        </div>

        <section aria-label="Ringkasan hari ini" className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric icon={UsersRound} label="Kunjungan hari ini" value={visitorCount.value} note="Catatan dalam arsip buku tamu" />
          <Metric icon={ClipboardList} label="Laporan AI hari ini" value={`${reportCount.value} / 12`} note="Target 3 shift × 4 regu" />
          <Metric icon={IdCard} label="Temuan ID card hari ini" value={incidents.filter((incident) => incident.reportDate === today).length} note="Belum ada · tertinggal · rusak" />
        </section>

        <section id="laporan-ai" className="mt-7 scroll-mt-6 rounded-2xl border border-white/[0.08] bg-[#101419] p-4 sm:p-6">
          <SectionTitle eyebrow="AI · tinjau sebelum simpan" title="Susun laporan dari chat" description="Tempel laporan jaga atau daftar karyawan tanpa ID card. AI membuat draf terstruktur; data baru masuk arsip setelah Anda meninjau dan menyimpan." />
          <div className="mt-5"><AiReportWorkspace /></div>
        </section>

        <div className="mt-7"><ReportAnalytics reports={reports} incidents={incidents} /></div>

        {controlError ? <p role="alert" className="mt-7 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-4 py-3 text-xs text-rose-200">{controlError}</p> : null}
        {updated === '1' ? <p role="status" className="mt-7 rounded-xl border border-lime-300/20 bg-lime-300/[0.06] px-4 py-3 text-xs text-lime-200">Status kunjungan dan visitor pass berhasil diperbarui.</p> : null}

        <section id="riwayat-tamu" className="mt-7 scroll-mt-6 rounded-2xl border border-white/[0.08] bg-[#101419] p-5 sm:p-6">
          <SectionTitle eyebrow="Arsip buku tamu" title="Pemantauan tamu dari VISTA" description="Menampilkan data tamu yang sudah masuk ke arsip SecSystem. Informasi kontak lengkap hanya tersedia di portal admin." />
          <div className="mt-4"><AdminVisitorTable visitors={visitors} /></div>
        </section>

        <section id="riwayat-laporan" className="mt-5 rounded-2xl border border-white/[0.08] bg-[#101419] p-5 sm:p-6">
          <SectionTitle eyebrow="Arsip AI" title="Laporan yang sudah ditinjau" description="Setiap laporan dapat dicetak sebagai PDF atau diunduh sebagai workbook Excel." />
          <div className="mt-4"><AiReportTable reports={reports} /></div>
        </section>

        {legacyReports.length > 0 ? <details className="mt-5 rounded-2xl border border-white/[0.08] bg-[#101419] p-5 sm:p-6">
          <summary className="cursor-pointer text-sm font-semibold text-slate-200">Arsip laporan manual sebelumnya ({legacyReports.length} terbaru)</summary>
          <div className="mt-4"><AdminReportTable reports={legacyReports} /></div>
        </details> : null}

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
