import { and, desc, eq, gte, lt } from 'drizzle-orm'
import { Activity, BarChart3, CalendarDays, ShieldCheck, UsersRound } from 'lucide-react'
import { MonthlyOperationsCharts, SoiIndicatorChart } from '@/components/soi-charts'
import { PortalHeader } from '@/components/portal-header'
import { requireAppUser } from '@/lib/authz'
import { db } from '@/lib/db'
import { aiGuardReports, employeeIdCardIncidents, visitorRecords } from '@/lib/db/schema'
import { buildDailyOperations, getMonthBounds, summarizeMonth } from '@/lib/monthly-recap'
import { getJakartaDate } from '@/lib/format'
import { calculateSoi, soiBaseline } from '@/lib/soi-baseline'

export const dynamic = 'force-dynamic'

export default async function SoiDashboardPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const current = await requireAppUser('admin')
  const params = await searchParams
  const month = getMonthBounds(params.month ?? '') ? params.month! : getJakartaDate().slice(0, 7)
  const bounds = getMonthBounds(month)!
  const workspace = current.workspaceId

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
  const operations = summarizeMonth(daily, reports)
  const calculatedSoi = calculateSoi(soiBaseline.leadingPercent, soiBaseline.laggingPercent, soiBaseline.csiPercent)
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(`${bounds.startDate}T12:00:00+07:00`))

  return (
    <main className="min-h-screen bg-[#080b0f] text-slate-100">
      <PortalHeader user={current} section="SOI" />
      <div className="mx-auto max-w-[1480px] px-4 pb-12 pt-7 sm:px-7 lg:px-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lime-200">Security Operational Index</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Manajemen pengamanan</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Pantau indikator kualitas SOI dari workbook acuan dan kuantitas operasional dari laporan tugas jaga yang sudah ditinjau.</p>
          </div>
          <form method="get" className="flex items-end gap-2">
            <label className="flex flex-col gap-1.5 text-[10px] font-medium text-slate-500" htmlFor="soi-month">Periode operasional
              <input id="soi-month" type="month" name="month" defaultValue={month} className="h-10 rounded-xl border border-white/10 bg-[#101419] px-3 text-xs text-slate-200 outline-none focus:border-lime-300/70" />
            </label>
            <button type="submit" className="h-10 rounded-xl border border-white/10 px-3 text-xs font-medium text-slate-200 transition hover:bg-white/[0.06]">Terapkan</button>
          </form>
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs text-slate-400"><CalendarDays size={14} aria-hidden="true" /> {monthLabel}</div>

        <section aria-label="Security Operational Index baseline" className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SoiMetric icon={ShieldCheck} label="SOI resmi · Juli 2026" value={`${soiBaseline.overallPercent.toFixed(2)}%`} note="Nilai akhir workbook acuan" emphasis />
          <SoiMetric icon={Activity} label="Leading indicator" value={`${soiBaseline.leadingPercent.toFixed(2)}%`} note="Bobot 50% pada formula SOI" />
          <SoiMetric icon={BarChart3} label="Lagging indicator" value={`${soiBaseline.laggingPercent.toFixed(0)}%`} note="Bobot 30% pada formula SOI" />
          <SoiMetric icon={UsersRound} label="Customer Satisfaction" value={`${soiBaseline.csiPercent.toFixed(0)}%`} note="Bobot 20% pada formula SOI" />
        </section>

        <section className="mt-6 rounded-2xl border border-lime-300/15 bg-lime-300/[0.04] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-lime-200">Formula workbook</p><p className="mt-1 text-sm font-semibold text-white">SOI = 50% Leading + 30% Lagging + 20% CSI</p><p className="mt-1 text-[10px] leading-5 text-slate-400">Baseline: {soiBaseline.source}. Formula workbook menghitung {calculatedSoi.toFixed(2)}%; dashboard mempertahankan nilai sumber {soiBaseline.overallPercent.toFixed(2)}%. Grafik operasional periode {monthLabel} di bawah dihitung terpisah dari laporan AI.</p></div>
            <div className="flex flex-wrap gap-2 text-[10px] text-slate-400"><span className="rounded-full border border-white/10 px-2.5 py-1">Leading {soiBaseline.leadingPercent.toFixed(2)}%</span><span className="rounded-full border border-white/10 px-2.5 py-1">Lagging {soiBaseline.laggingPercent.toFixed(0)}%</span><span className="rounded-full border border-white/10 px-2.5 py-1">CSI {soiBaseline.csiPercent.toFixed(0)}%</span></div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <SoiIndicatorChart indicators={soiBaseline.indicators} />
          <section className="rounded-2xl border border-white/[0.08] bg-[#101419] p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-lime-200">Kuantitas periode {monthLabel}</p>
            <h2 className="mt-1 text-sm font-semibold text-white">Volume operasional tercatat</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <MiniMetric label="Shift masuk" value={operations.reportCount} note={`Dari target ${operations.expectedReports}`} />
              <MiniMetric label="Cakupan laporan" value={`${operations.coveragePercent.toFixed(1)}%`} note="3 shift × 4 regu per hari" />
              <MiniMetric label="Person-shift" value={operations.personShifts} note="Jumlah personel per laporan" />
              <MiniMetric label="Temuan kartu ID" value={operations.cardIncidents} note="Semua kategori status" />
              <MiniMetric label="Kunjungan tersimpan" value={operations.visitorVisits} note={`${operations.visitorGuests} orang di buku tamu`} />
              <MiniMetric label="Hari dengan kendaraan" value={operations.vehicleDays} note="Snapshot lokasi menginap" />
            </div>
            <p className="mt-3 text-[10px] leading-5 text-slate-600">Angka kuantitas diambil dari arsip buku tamu dan laporan AI yang tersimpan, bukan estimasi AI.</p>
          </section>
        </section>

        <section className="mt-6">
          <div className="mb-3"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-lime-200">Kualitas dan kuantitas harian</p><h2 className="mt-1 text-lg font-semibold text-white">Tren operasional · {monthLabel}</h2></div>
          <MonthlyOperationsCharts daily={daily} />
        </section>

        <section className="mt-6 rounded-2xl border border-white/[0.08] bg-[#101419] p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-lime-200">KPI SOI</p><h2 className="mt-1 text-sm font-semibold text-white">Leading dan lagging indicator</h2></div><span className="text-[10px] text-slate-500">Maturity level 1–3 mengikuti workbook</span></div>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wide text-slate-500"><th className="pb-2 pr-3 font-medium">Kategori</th><th className="pb-2 pr-3 font-medium">Jenis</th><th className="pb-2 pr-3 font-medium">Indikator</th><th className="pb-2 pr-3 font-medium">Target</th><th className="pb-2 pr-3 font-medium">Performance</th><th className="pb-2 pr-3 font-medium">Achievement</th><th className="pb-2 font-medium">Maturity</th></tr></thead><tbody className="divide-y divide-white/[0.05]">{soiBaseline.indicators.map((indicator) => <tr key={`${indicator.side}-${indicator.name}`}><td className="py-2.5 pr-3 text-slate-300">{indicator.category}</td><td className="py-2.5 pr-3 text-slate-500">{indicator.side}</td><td className="py-2.5 pr-3 font-medium text-slate-200">{indicator.name}</td><td className="py-2.5 pr-3 text-slate-500">{indicator.target}</td><td className="py-2.5 pr-3 text-slate-300">{indicator.performance.toFixed(2)}{indicator.performanceUnit === '%' ? '%' : ' poin'}</td><td className="py-2.5 pr-3 font-semibold text-lime-100">{indicator.achievementPercent.toFixed(2)}%</td><td className="py-2.5 text-slate-300">{indicator.maturity}</td></tr>)}</tbody></table></div>
          <p className="mt-3 text-[10px] leading-5 text-slate-600">Catatan CSI: achievement aggregate 90% mengikuti formula SOI di workbook. Sheet CSI juga mencatat performance 8.9 terhadap target rata-rata 4.</p>
        </section>

        <p className="mt-5 text-center text-[10px] text-slate-600">Data SOI resmi ini adalah baseline workbook Juli 2026. Rekap operasional harian berubah sesuai laporan yang ditinjau admin.</p>
      </div>
    </main>
  )
}

function SoiMetric({ icon: Icon, label, value, note, emphasis = false }: { icon: typeof ShieldCheck; label: string; value: string; note: string; emphasis?: boolean }) {
  return <article className={`rounded-2xl border p-4 ${emphasis ? 'border-lime-300/20 bg-lime-300/[0.05]' : 'border-white/[0.08] bg-[#101419]'}`}><div className="flex items-center gap-2 text-slate-500"><Icon size={14} aria-hidden="true" /><p className="text-[10px]">{label}</p></div><p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p><p className="mt-1 text-[10px] text-slate-500">{note}</p></article>
}

function MiniMetric({ label, value, note }: { label: string; value: number | string; note: string }) {
  return <article className="rounded-xl border border-white/[0.06] bg-[#0b0f13] p-3"><p className="text-[9px] uppercase tracking-wide text-slate-600">{label}</p><p className="mt-1.5 text-lg font-semibold text-white">{value}</p><p className="mt-1 text-[9px] leading-4 text-slate-600">{note}</p></article>
}
