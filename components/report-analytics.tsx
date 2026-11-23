'use client'

import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { aiGuardReports, employeeIdCardIncidents } from '@/lib/db/schema'
import type { GuardReportDraft, IdCardStatus } from '@/lib/guard-report'
import type { InferSelectModel } from 'drizzle-orm'

type AiReport = InferSelectModel<typeof aiGuardReports>
type IdCardIncident = InferSelectModel<typeof employeeIdCardIncidents>

const vehicleConfig = {
  motorcycles: { label: 'Motor', color: 'var(--chart-1)' },
  cars: { label: 'Mobil', color: 'var(--chart-2)' },
} satisfies ChartConfig

const cardConfig = {
  missing: { label: 'Belum ada', color: 'var(--chart-3)' },
  forgotten: { label: 'Tertinggal', color: 'var(--chart-1)' },
  damaged: { label: 'Rusak', color: 'var(--chart-5)' },
} satisfies ChartConfig

export function ReportAnalytics({ reports, incidents }: { reports: AiReport[]; incidents: IdCardIncident[] }) {
  const latest = reports[0]
  const latestVehicleReport = reports.find((report) => report.structuredData.vehicles.motorcycles.length > 0 || report.structuredData.vehicles.cars.length > 0) ?? latest
  const latestRosterReport = reports.find((report) => report.structuredData.attendance.roster.length > 0) ?? latest
  const vehicleRows = buildVehicleRows(latestVehicleReport?.structuredData)
  const allOpenTasks = reports.flatMap((report) => report.structuredData.tasks
    .filter((task) => task.status === 'Perlu tindak lanjut' || task.status === 'Berjalan')
    .map((task) => ({ ...task, reportDate: report.reportDate, shift: report.shift, team: report.team })))
  const openTasks = allOpenTasks.slice(0, 6)
  const statusRows = (['Belum ada', 'Tertinggal', 'Rusak'] as const).map((label) => ({
    status: statusKey(label),
    label,
    count: incidents.filter((incident) => incident.status === label).length,
  }))
  const latestAttendance = latestRosterReport?.structuredData.attendance
  const rosterCount = latestAttendance?.roster.length ?? 0
  const headcountDelta = latestAttendance?.reportedCount === null || latestAttendance?.reportedCount === undefined
    ? null
    : latestAttendance.reportedCount - rosterCount
  const needsReview = reports.filter((report) => report.reportType !== 'id-card' && report.structuredData.attendanceStatus === 'Perlu verifikasi').length

  return (
    <section aria-label="KPI personel, kendaraan, dan kartu ID" className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Nama di roster terbaru" value={rosterCount} note={latestAttendance?.reportedCount == null ? 'Jumlah laporan belum disebut' : `Jumlah tertulis ${latestAttendance.reportedCount}`} />
        <Metric label="Selisih jumlah" value={headcountDelta === null ? '—' : Math.abs(headcountDelta)} note={headcountDelta === null ? 'Belum cukup data untuk membandingkan' : headcountDelta === 0 ? 'Jumlah cocok dengan roster unik' : headcountDelta > 0 ? 'Nama belum tercantum di roster' : 'Roster melebihi jumlah laporan'} />
        <Metric label="Kehadiran perlu dicek" value={needsReview} note="Laporan dengan data kehadiran ambigu" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-2xl border border-white/[0.08] bg-[#101419] p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-lime-200">Snapshot terakhir</p><h3 className="mt-1 text-sm font-semibold text-white">Kendaraan menginap per lokasi</h3></div>
            <p className="text-[10px] text-slate-500">{latestVehicleReport ? `${latestVehicleReport.reportDate}${latestVehicleReport.shift ? ` · Shift ${latestVehicleReport.shift}` : ''}${latestVehicleReport.team ? ` · Regu ${latestVehicleReport.team}` : ''}` : 'Belum ada data'}</p>
          </div>
          {vehicleRows.length ? (
            <ChartContainer config={vehicleConfig} className="mt-3 h-[230px] w-full">
              <BarChart accessibilityLayer data={vehicleRows} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="location" tickLine={false} axisLine={false} tickMargin={8} interval={0} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="motorcycles" fill="var(--color-motorcycles)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cars" fill="var(--color-cars)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : <EmptyState>Data lokasi kendaraan akan tampil setelah laporan jaga tersimpan.</EmptyState>}
          {latestVehicleReport?.structuredData.vehicles.operationalVehicles !== null && latestVehicleReport?.structuredData.vehicles.operationalVehicles !== undefined ? <p className="mt-1 text-[10px] text-slate-500">Kendaraan operasional dilaporkan {latestVehicleReport.structuredData.vehicles.operationalVehicles} unit dan ditampilkan terpisah dari area parkir.</p> : null}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#101419] p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-lime-200">Pemantauan karyawan</p>
          <h3 className="mt-1 text-sm font-semibold text-white">Temuan kartu ID</h3>
          <p className="mt-1 text-[10px] text-slate-500">Total insiden dari laporan AI yang tersimpan</p>
          {incidents.length ? (
            <div className="mt-2 grid grid-cols-[128px_1fr] items-center gap-2 sm:grid-cols-[140px_1fr]">
              <ChartContainer config={cardConfig} className="h-[150px] w-full">
                <PieChart accessibilityLayer>
                  <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                  <Pie data={statusRows} dataKey="count" nameKey="status" innerRadius={42} outerRadius={62} paddingAngle={3} stroke="none">
                    {statusRows.map((row) => <Cell key={row.status} fill={`var(--color-${row.status})`} />)}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="flex flex-col gap-2">
                {statusRows.map((row) => <div key={row.status} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.025] px-2.5 py-2 text-[11px]"><span className="text-slate-400">{row.label}</span><span className="font-semibold text-white">{row.count}</span></div>)}
                <p className="text-[10px] text-slate-600">Total {incidents.length} temuan</p>
              </div>
            </div>
          ) : <EmptyState>Belum ada temuan kartu ID.</EmptyState>}
          {incidents.length ? <div className="mt-2 max-h-44 overflow-y-auto border-t border-white/[0.06] pt-2">{incidents.slice(0, 8).map((incident) => <div key={incident.id} className="flex items-start justify-between gap-3 py-1.5 text-[10px]"><div className="min-w-0"><p className="truncate text-slate-200">{incident.employeeName} <span className="text-slate-600">/ {incident.department || '—'}</span></p><p className="text-slate-600">{incident.reportDate}</p></div><span className="shrink-0 text-slate-400">{incident.status}</span></div>)}</div> : null}
        </section>
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-[#101419] p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-lime-200">Tindak lanjut</p><h3 className="mt-1 text-sm font-semibold text-white">Pemantauan tugas anggota</h3></div><span className="text-[10px] text-slate-500">{allOpenTasks.length} tugas berjalan / perlu tindak lanjut</span></div>
        {openTasks.length ? <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{openTasks.map((task, index) => <li key={`${task.reportDate}-${task.task}-${index}`} className="rounded-xl border border-white/[0.06] bg-[#0b0f13] p-3"><div className="flex items-start justify-between gap-2"><p className="text-xs leading-5 text-slate-200">{task.task}</p><span className="shrink-0 rounded-full bg-amber-300/10 px-2 py-1 text-[9px] text-amber-100">{task.status}</span></div><p className="mt-2 text-[10px] text-slate-600">{task.assignee || 'Penanggung jawab belum disebut'} · {task.reportDate}</p></li>)}</ul> : <EmptyState>Belum ada tugas yang ditandai berjalan atau perlu tindak lanjut.</EmptyState>}
      </section>
    </section>
  )
}

function Metric({ label, value, note }: { label: string; value: number | string; note: string }) {
  return <article className="rounded-xl border border-white/[0.08] bg-[#101419] p-4"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p><p className="mt-1 text-[10px] leading-4 text-slate-600">{note}</p></article>
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-white/[0.1] px-4 py-7 text-center text-[11px] text-slate-600">{children}</div>
}

function buildVehicleRows(data?: GuardReportDraft) {
  if (!data) return []
  const rows = new Map<string, { location: string; motorcycles: number; cars: number }>()
  for (const area of data.vehicles.motorcycles) {
    const key = area.location.trim().toLowerCase()
    const existing = rows.get(key) ?? { location: area.location, motorcycles: 0, cars: 0 }
    existing.motorcycles += area.count
    rows.set(key, existing)
  }
  for (const area of data.vehicles.cars) {
    const key = area.location.trim().toLowerCase()
    const existing = rows.get(key) ?? { location: area.location, motorcycles: 0, cars: 0 }
    existing.cars += area.count
    rows.set(key, existing)
  }
  return [...rows.values()]
}

function statusKey(status: IdCardStatus) {
  if (status === 'Belum ada') return 'missing'
  if (status === 'Tertinggal') return 'forgotten'
  return 'damaged'
}
