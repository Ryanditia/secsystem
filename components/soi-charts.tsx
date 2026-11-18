'use client'

import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { DailyOperations } from '@/lib/monthly-recap'
import type { SoiIndicator, SoiIndicatorSide } from '@/lib/soi-baseline'

const indicatorConfig = {
  achievementPercent: { label: 'Pencapaian', color: 'var(--chart-1)' },
} satisfies ChartConfig

const quantityConfig = {
  shiftReports: { label: 'Laporan shift', color: 'var(--chart-1)' },
  reportedPersonnel: { label: 'Person-shift', color: 'var(--chart-2)' },
  vehicleTotal: { label: 'Kendaraan', color: 'var(--chart-3)' },
  cardIncidents: { label: 'Temuan ID card', color: 'var(--chart-5)' },
} satisfies ChartConfig

const qualityConfig = {
  attendanceQuality: { label: 'Kehadiran lengkap', color: 'var(--chart-1)' },
  taskQualityPercent: { label: 'Tugas selesai', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function SoiIndicatorChart({ indicators }: { indicators: readonly SoiIndicator[] }) {
  const [side, setSide] = useState<'All' | SoiIndicatorSide>('All')
  const rows = useMemo(() => indicators
    .filter((indicator) => side === 'All' || indicator.side === side)
    .map((indicator) => ({
      ...indicator,
      shortName: indicator.name.length > 18 ? `${indicator.name.slice(0, 16)}…` : indicator.name,
    })), [indicators, side])

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#101419] p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-lime-200">Kualitas</p><h3 className="mt-1 text-sm font-semibold text-white">Pencapaian indikator SOI</h3><p className="mt-1 text-[10px] text-slate-500">Persentase pencapaian terhadap target dari workbook SOI.</p></div>
        <label className="flex items-center gap-2 text-[10px] text-slate-500">Jenis
          <select value={side} onChange={(event) => setSide(event.target.value as 'All' | SoiIndicatorSide)} className="h-9 rounded-lg border border-white/10 bg-[#0a0d11] px-2 text-xs text-slate-200 outline-none focus:border-lime-300/70">
            <option value="All">Semua</option><option value="Leading">Leading</option><option value="Lagging">Lagging</option><option value="CSI">CSI</option>
          </select>
        </label>
      </div>
      <ChartContainer config={indicatorConfig} className="mt-3 h-[290px] w-full">
        <BarChart accessibilityLayer data={rows} margin={{ left: -14, right: 10, top: 12 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="shortName" tickLine={false} axisLine={false} tickMargin={8} interval={0} angle={-22} textAnchor="end" height={62} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={(_label, payload) => payload?.[0]?.payload?.name ?? ''} formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Pencapaian']} />} />
          <Bar dataKey="achievementPercent" fill="var(--color-achievementPercent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
      <p className="mt-2 text-[10px] leading-4 text-slate-600">Skor di atas 100% menunjukkan realisasi melebihi target; maturity level tetap mengikuti lembar SOI sumber.</p>
    </section>
  )
}

export function MonthlyOperationsCharts({ daily }: { daily: DailyOperations[] }) {
  const quantityExists = daily.some((day) => day.shiftReports > 0 || day.reportedPersonnel > 0 || day.vehicleTotal !== null || day.cardIncidents > 0)
  const quantityRows = daily.map((day) => ({ ...day, vehicleTotal: day.vehicleTotal ?? 0 }))
  const qualityRows = daily.map((day) => ({
    ...day,
    attendanceQuality: day.shiftReports > 0 ? day.completeReports / day.shiftReports * 100 : null,
    taskQualityPercent: day.taskQualityPercent,
  }))
  const qualityExists = daily.some((day) => day.shiftReports > 0 || day.tasksTotal > 0)

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-white/[0.08] bg-[#101419] p-4 sm:p-5">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-lime-200">Kuantitas</p><h3 className="mt-1 text-sm font-semibold text-white">Volume operasional per hari</h3><p className="mt-1 text-[10px] text-slate-500">Laporan shift, person-shift, kendaraan snapshot, dan temuan ID card.</p></div>
        {quantityExists ? <ChartContainer config={quantityConfig} className="mt-3 h-[270px] w-full">
          <BarChart accessibilityLayer data={quantityRows} margin={{ left: -14, right: 8, top: 12 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="dayLabel" tickLine={false} axisLine={false} tickMargin={8} interval={Math.max(Math.floor(daily.length / 10), 0)} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(_label, payload) => payload?.[0]?.payload?.date ?? ''} />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="shiftReports" fill="var(--color-shiftReports)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="reportedPersonnel" fill="var(--color-reportedPersonnel)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="vehicleTotal" fill="var(--color-vehicleTotal)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="cardIncidents" fill="var(--color-cardIncidents)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer> : <ChartEmpty>Belum ada laporan pada periode ini. Grafik terisi setelah draf disimpan.</ChartEmpty>}
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-[#101419] p-4 sm:p-5">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-lime-200">Kualitas</p><h3 className="mt-1 text-sm font-semibold text-white">Kehadiran lengkap & tugas selesai</h3><p className="mt-1 text-[10px] text-slate-500">Rasio dari laporan yang masuk; hari tanpa data tidak dianggap 0%.</p></div>
        {qualityExists ? <ChartContainer config={qualityConfig} className="mt-3 h-[270px] w-full">
          <LineChart accessibilityLayer data={qualityRows} margin={{ left: -14, right: 12, top: 14 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="dayLabel" tickLine={false} axisLine={false} tickMargin={8} interval={Math.max(Math.floor(daily.length / 10), 0)} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(_label, payload) => payload?.[0]?.payload?.date ?? ''} formatter={(value) => [value == null ? 'Belum ada data' : `${Number(value).toFixed(1)}%`]} />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line type="monotone" dataKey="attendanceQuality" stroke="var(--color-attendanceQuality)" strokeWidth={2} connectNulls={false} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="taskQualityPercent" stroke="var(--color-taskQualityPercent)" strokeWidth={2} connectNulls={false} dot={{ r: 2 }} />
          </LineChart>
        </ChartContainer> : <ChartEmpty>Belum cukup data untuk menghitung kualitas kehadiran atau penyelesaian tugas.</ChartEmpty>}
      </section>
    </div>
  )
}

function ChartEmpty({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 flex h-[270px] items-center justify-center rounded-xl border border-dashed border-white/[0.1] px-5 text-center text-xs text-slate-500">{children}</div>
}
