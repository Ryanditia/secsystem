import { and, count, desc, eq, ne } from 'drizzle-orm'
import { CalendarDays, ClipboardCheck, UsersRound } from 'lucide-react'
import { PortalHeader } from '@/components/portal-header'
import { DateFilter } from '@/components/record-search'
import { ReportAnalytics } from '@/components/report-analytics'
import { requireAppUser } from '@/lib/authz'
import { db } from '@/lib/db'
import { aiGuardReports, employeeIdCardIncidents, guardReports, visitorRecords } from '@/lib/db/schema'
import { getJakartaDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function SupervisorPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const current = await requireAppUser('supervisor')
  const { date: requestedDate = getJakartaDate() } = await searchParams
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : getJakartaDate()
  const workspace = current.workspaceId

  const [visitors, reports, aiReports, idCardIncidents, [visitorCount], [reportCount]] = await Promise.all([
    db.select({
      id: visitorRecords.id,
      visitorName: visitorRecords.visitorName,
      company: visitorRecords.company,
      host: visitorRecords.host,
      purpose: visitorRecords.purpose,
      arrivalTime: visitorRecords.arrivalTime,
      plannedDepartureTime: visitorRecords.plannedDepartureTime,
      guestCount: visitorRecords.guestCount,
      visitorPassStatus: visitorRecords.visitorPassStatus,
      visitStatus: visitorRecords.visitStatus,
    }).from(visitorRecords).where(and(eq(visitorRecords.userId, workspace), eq(visitorRecords.visitDate, selectedDate))).orderBy(visitorRecords.arrivalTime).limit(200),
    db.select().from(guardReports).where(and(eq(guardReports.userId, workspace), eq(guardReports.reportDate, selectedDate))).orderBy(guardReports.shift, guardReports.team).limit(24),
    db.select().from(aiGuardReports).where(eq(aiGuardReports.userId, workspace)).orderBy(desc(aiGuardReports.reportDate), desc(aiGuardReports.createdAt)).limit(30),
    db.select().from(employeeIdCardIncidents).where(eq(employeeIdCardIncidents.userId, workspace)).orderBy(desc(employeeIdCardIncidents.reportDate), desc(employeeIdCardIncidents.createdAt)).limit(50),
    db.select({ value: count() }).from(visitorRecords).where(and(eq(visitorRecords.userId, workspace), eq(visitorRecords.visitDate, selectedDate))),
    db.select({ value: count() }).from(aiGuardReports).where(and(eq(aiGuardReports.userId, workspace), eq(aiGuardReports.reportDate, selectedDate), ne(aiGuardReports.reportType, 'id-card'))),
  ])

  const headcount = visitors.reduce((total, visitor) => total + (Number.parseInt(visitor.guestCount, 10) || 0), 0)
  const shiftReports = aiReports.filter((report) => report.reportType !== 'id-card')
  const incompleteReports = shiftReports.filter((report) => report.structuredData.attendanceStatus !== 'Lengkap').length
  const findingsCount = aiReports.filter((report) => report.structuredData.findings.length > 0 || report.structuredData.cardIncidents.length > 0).length
  const idCardCount = idCardIncidents.filter((incident) => incident.reportDate === selectedDate).length
  const [year, month, day] = selectedDate.split('-').map(Number)
  const dateLabel = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(year, month - 1, day))

  return (
    <main className="min-h-screen bg-[#080b0f] text-slate-100">
      <PortalHeader user={current} section="Ringkasan" />
      <div className="mx-auto max-w-[1480px] px-4 pb-12 pt-7 sm:px-7 lg:px-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lime-200">Pemantauan kinerja</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Ringkasan operasional</h1>
            <p className="mt-2 text-sm text-slate-500">Pantau data tamu tersimpan, laporan AI, personel, tugas, kendaraan, dan kartu ID tanpa mengubah data.</p>
          </div>
          <DateFilter date={selectedDate} />
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs text-slate-400"><CalendarDays size={15} aria-hidden="true" /> {dateLabel}</div>
        <section id="ringkasan" aria-label="Ringkasan kinerja" className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric icon={UsersRound} label="Catatan kunjungan" value={visitorCount.value} note={`${headcount} tamu tercatat`} />
          <Metric icon={ClipboardCheck} label="Laporan AI masuk" value={`${reportCount.value} / 12`} note="Target 3 shift × 4 regu" />
          <Metric icon={ClipboardCheck} label="Perlu verifikasi" value={incompleteReports} note="Kehadiran masih ambigu atau kurang" />
          <Metric icon={ClipboardCheck} label="Laporan dengan temuan" value={findingsCount} note="Perlu tindak lanjut supervisor" />
          <Metric icon={ClipboardCheck} label="Temuan kartu ID" value={idCardCount} note="Pada tanggal terpilih" />
        </section>

        <section className="mt-6"><SectionTitle eyebrow="Read-only" title="KPI personel, kendaraan, dan tugas" description="Ringkasan dari laporan AI yang sudah ditinjau admin." /><div className="mt-4"><ReportAnalytics reports={aiReports} incidents={idCardIncidents} /></div></section>

        <section id="tamu" className="mt-7 scroll-mt-5 rounded-2xl border border-white/[0.08] bg-[#101419] p-5 sm:p-6">
          <SectionTitle eyebrow="Read-only" title="Kontrol tamu" description="Data kontak pribadi tidak ditampilkan di portal supervisor." />
          <div className="mt-4"><SupervisorVisitorTable visitors={visitors} /></div>
        </section>

        <section id="laporan" className="mt-5 scroll-mt-5 rounded-2xl border border-white/[0.08] bg-[#101419] p-5 sm:p-6">
          <SectionTitle eyebrow="I · II · III" title="Rekap tugas jaga" description="Pantau regu, personel, kehadiran, kegiatan shift, lembur, proyek, dan temuan." />
          <div className="mt-4"><SupervisorReportTable reports={reports} /></div>
        </section>
        <p className="mt-5 text-center text-[10px] text-slate-600">Mode supervisor bersifat read-only. Perubahan data hanya dapat dilakukan admin.</p>
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

function SupervisorVisitorTable({ visitors }: { visitors: Array<{ id: string; visitorName: string; company: string | null; host: string | null; purpose: string | null; arrivalTime: string; plannedDepartureTime: string; guestCount: string; visitorPassStatus: string; visitStatus: string }> }) {
  if (visitors.length === 0) return <EmptyState>Belum ada kunjungan pada tanggal ini.</EmptyState>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead><tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-[0.12em] text-slate-500"><th className="pb-3 pr-4 font-medium">Tamu / Instansi</th><th className="pb-3 pr-4 font-medium">Bertemu</th><th className="pb-3 pr-4 font-medium">Tujuan</th><th className="pb-3 pr-4 font-medium">Waktu</th><th className="pb-3 pr-4 font-medium">Jumlah</th><th className="pb-3 font-medium">Status</th></tr></thead>
        <tbody className="divide-y divide-white/[0.05]">{visitors.map((visitor) => <tr key={visitor.id} className="align-top"><td className="py-3 pr-4"><p className="font-medium text-slate-200">{visitor.visitorName}</p><p className="mt-1 text-[10px] text-slate-500">{visitor.company || 'Perorangan'}</p></td><td className="py-3 pr-4 text-slate-400">{visitor.host || '—'}</td><td className="py-3 pr-4 text-slate-400">{visitor.purpose || '—'}</td><td className="py-3 pr-4 whitespace-nowrap text-slate-400">{visitor.arrivalTime || '—'} – {visitor.plannedDepartureTime || '—'}</td><td className="py-3 pr-4 text-slate-300">{visitor.guestCount}</td><td className="py-3 text-slate-400"><span className="block">{visitStatusLabel(visitor.visitStatus)}</span><span className="mt-1 block text-[10px]">{visitorPassLabel(visitor.visitorPassStatus)}</span></td></tr>)}</tbody>
      </table>
    </div>
  )
}

function SupervisorReportTable({ reports }: { reports: Array<{ id: string; reportDate: string; shift: string; team: string; attendanceStatus: string; attendanceNotes: string; staffing: Record<string, string>; overtimeNotes: string; visitorProjectNotes: string; findings: string; reporter: string; activities: string }> }) {
  if (reports.length === 0) return <EmptyState>Belum ada laporan jaga pada tanggal ini.</EmptyState>
  return (
    <div className="flex flex-col gap-3">
      {reports.map((report) => (
        <article key={report.id} className="rounded-xl border border-white/[0.07] bg-[#0b0f13] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><span className="rounded-lg bg-white/[0.07] px-2.5 py-1 text-xs font-semibold text-white">Shift {report.shift}</span><span className="text-xs text-slate-300">Regu {report.team}</span><span className={`rounded-full px-2 py-1 text-[10px] ${report.attendanceStatus === 'Lengkap' ? 'bg-lime-300/10 text-lime-200' : 'bg-amber-300/10 text-amber-200'}`}>{report.attendanceStatus}</span></div>
            <span className="text-[10px] text-slate-500">Pelapor: {report.reporter || '—'}</span>
          </div>
          {report.attendanceNotes ? <p className="mt-3 text-[11px] text-amber-100">Catatan kehadiran: {report.attendanceNotes}</p> : null}
          <dl className="mt-3 grid gap-x-5 gap-y-2 text-[10px] sm:grid-cols-2 lg:grid-cols-3">{[
            ['Pos 1', report.staffing?.pos1], ['Pos 2', report.staffing?.pos2], ['Pos 3', report.staffing?.pos3], ['Patroli', report.staffing?.patrol], ['Lobby', report.staffing?.lobby], ['Basement', report.staffing?.basement],
          ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-slate-600">{label}</dt><dd className="mt-0.5 truncate text-slate-300">{value || '—'}</dd></div>)}</dl>
          {report.activities ? <p className="mt-3 whitespace-pre-wrap text-[11px] leading-5 text-slate-400">{report.activities}</p> : null}
          <div className="mt-3 grid gap-2 border-t border-white/[0.06] pt-3 text-[10px] sm:grid-cols-2">
            <p><span className="text-slate-600">Lembur:</span> <span className="text-slate-400">{report.overtimeNotes || '—'}</span></p>
            <p><span className="text-slate-600">Tamu / proyek:</span> <span className="text-slate-400">{report.visitorProjectNotes || '—'}</span></p>
            <p className="sm:col-span-2"><span className="text-slate-600">Temuan:</span> <span className={isFinding(report.findings) ? 'text-amber-100' : 'text-slate-400'}>{report.findings || 'Nihil'}</span></p>
          </div>
        </article>
      ))}
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-white/[0.1] px-4 py-10 text-center text-xs text-slate-500">{children}</div>
}

function isFinding(value: string) {
  return Boolean(value.trim() && !['nihil', 'tidak ada', '-'].includes(value.trim().toLowerCase()))
}

function visitorPassLabel(value: string) {
  if (value === 'diberikan') return 'Pass diberikan'
  if (value === 'dikembalikan') return 'Pass dikembalikan'
  if (value === 'tercatat_di_sheet') return 'Riwayat sheet'
  return 'Pass belum diberikan'
}

function visitStatusLabel(value: string) {
  if (value === 'sedang_berkunjung') return 'Sedang di lokasi'
  if (value === 'selesai') return 'Selesai'
  return 'Terjadwal'
}
