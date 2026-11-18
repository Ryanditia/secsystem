import Link from 'next/link'
import { and, desc, eq, gte, lt } from 'drizzle-orm'
import { CalendarDays, Download, Printer } from 'lucide-react'
import { MonthlyOperationsCharts } from '@/components/soi-charts'
import { MonthlyRecapTable } from '@/components/monthly-recap-table'
import { PortalHeader } from '@/components/portal-header'
import { requireAppUser } from '@/lib/authz'
import { db } from '@/lib/db'
import { aiGuardReports, employeeIdCardIncidents, visitorRecords } from '@/lib/db/schema'
import { buildDailyOperations, getMonthBounds, summarizeMonth } from '@/lib/monthly-recap'
import { getJakartaDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function MonthlyRecapPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const current = await requireAppUser('admin')
  const workspace = current.workspaceId
  const params = await searchParams
  const [latest] = await db.select({ reportDate: aiGuardReports.reportDate }).from(aiGuardReports)
    .where(eq(aiGuardReports.userId, workspace))
    .orderBy(desc(aiGuardReports.reportDate), desc(aiGuardReports.createdAt))
    .limit(1)
  const defaultMonth = latest?.reportDate.slice(0, 7) ?? getJakartaDate().slice(0, 7)
  const month = getMonthBounds(params.month ?? '') ? params.month! : defaultMonth
  const bounds = getMonthBounds(month)!

  const [reports, incidents, visitors] = await Promise.all([
    db.select().from(aiGuardReports).where(and(
      eq(aiGuardReports.userId, workspace),
      gte(aiGuardReports.reportDate, bounds.startDate),
      lt(aiGuardReports.reportDate, bounds.nextMonth),
    )).orderBy(desc(aiGuardReports.reportDate), desc(aiGuardReports.createdAt)).limit(1000),
    db.select({ reportDate: employeeIdCardIncidents.reportDate, status: employeeIdCardIncidents.status }).from(employeeIdCardIncidents).where(and(
      eq(employeeIdCardIncidents.userId, workspace),
      gte(employeeIdCardIncidents.reportDate, bounds.startDate),
      lt(employeeIdCardIncidents.reportDate, bounds.nextMonth),
    )).limit(3000),
    db.select({ visitDate: visitorRecords.visitDate, guestCount: visitorRecords.guestCount }).from(visitorRecords).where(and(
      eq(visitorRecords.userId, workspace),
      gte(visitorRecords.visitDate, bounds.startDate),
      lt(visitorRecords.visitDate, bounds.nextMonth),
    )).limit(10000),
  ])

  const daily = buildDailyOperations(month, reports, incidents, visitors)
  const summary = summarizeMonth(daily, reports)
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(`${bounds.startDate}T12:00:00+07:00`))
  const reportQuery = `month=${month}`

  return (
    <main className="min-h-screen bg-[#080b0f] text-slate-100">
      <PortalHeader user={current} section="Rekap Harian" />
      <div className="mx-auto max-w-[1480px] px-4 pb-12 pt-7 sm:px-7 lg:px-10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lime-200">Dokumentasi operasional</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Rekap tugas jaga harian</h1>
            <p className="mt-2 text-sm text-slate-500">{monthLabel} · laporan AI tersimpan dikelompokkan per tanggal, shift, dan regu.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <form method="get" className="flex items-end gap-2">
              <label className="flex flex-col gap-1.5 text-[10px] font-medium text-slate-500" htmlFor="month">Periode
                <input id="month" type="month" name="month" defaultValue={month} className="h-10 rounded-xl border border-white/10 bg-[#101419] px-3 text-xs text-slate-200 outline-none focus:border-lime-300/70" />
              </label>
              <button type="submit" className="h-10 rounded-xl border border-white/10 px-3 text-xs font-medium text-slate-200 transition hover:bg-white/[0.06]">Terapkan</button>
            </form>
            <div className="flex gap-2">
              <Link href={`/admin/rekap/print?${reportQuery}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-medium text-slate-200 transition hover:bg-white/[0.06]"><Printer size={14} aria-hidden="true" /> PDF</Link>
              <a href={`/api/monthly-recap-export?${reportQuery}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-lime-300 px-3 text-xs font-semibold text-slate-950 transition hover:bg-lime-200"><Download size={14} aria-hidden="true" /> Excel</a>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Laporan shift" value={`${summary.reportCount} / ${summary.expectedReports}`} note={`${summary.coveragePercent.toFixed(1)}% cakupan 3 shift × 4 regu`} />
          <Metric label="Kehadiran lengkap" value={summary.attendanceQualityPercent === null ? '—' : `${summary.attendanceQualityPercent.toFixed(1)}%`} note={`${summary.completeReports} shift lengkap`} />
          <Metric label="Person-shift" value={summary.personShifts} note="Jumlah personel sesuai laporan / roster" />
          <Metric label="Tugas selesai" value={summary.taskQualityPercent === null ? '—' : `${summary.taskQualityPercent.toFixed(1)}%`} note={`${summary.tasksCompleted} dari ${summary.tasksTotal} tugas`} />
          <Metric label="Temuan kartu ID" value={summary.cardIncidents} note="Belum ada · tertinggal · rusak" />
        </div>

        <section className="mt-6 rounded-2xl border border-white/[0.08] bg-[#101419] p-4 sm:p-5">
          <div className="flex items-center gap-2"><CalendarDays size={15} className="text-lime-200" aria-hidden="true" /><p className="text-xs text-slate-300">Volume dan kualitas operasional · {monthLabel}</p></div>
          <div className="mt-4"><MonthlyOperationsCharts daily={daily} /></div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-lime-200">Format rekap</p><h2 className="mt-1 text-lg font-semibold text-white">Rincian per tanggal dan regu</h2></div><span className="text-[10px] text-slate-500">{reports.length} dokumen AI tersimpan</span></div>
          <MonthlyRecapTable reports={reports} />
        </section>

        <p className="mt-5 text-center text-[10px] text-slate-600">Rekap hanya memuat draf yang telah ditinjau dan disimpan oleh admin.</p>
      </div>
    </main>
  )
}

function Metric({ label, value, note }: { label: string; value: number | string; note: string }) {
  return <article className="rounded-2xl border border-white/[0.08] bg-[#101419] p-4"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p><p className="mt-1 text-[10px] leading-4 text-slate-600">{note}</p></article>
}
