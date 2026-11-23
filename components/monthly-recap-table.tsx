import type { MonthlyReportRecord } from '@/lib/monthly-recap'
import { formatDate } from '@/lib/format'

export function MonthlyRecapTable({ reports }: { reports: MonthlyReportRecord[] }) {
  if (reports.length === 0) return <div className="rounded-xl border border-dashed border-white/[0.1] px-4 py-12 text-center text-xs text-slate-500">Belum ada laporan AI pada periode ini. Laporan yang sudah ditinjau akan dikelompokkan per hari, shift, dan regu.</div>

  const grouped = new Map<string, MonthlyReportRecord[]>()
  for (const report of reports) {
    const dayReports = grouped.get(report.reportDate) ?? []
    dayReports.push(report)
    grouped.set(report.reportDate, dayReports)
  }

  return (
    <div className="flex flex-col gap-4">
      {[...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, dayReports]) => (
        <section key={date} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101419]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lime-200">Hari {Number(date.slice(8, 10))}</p><h3 className="mt-1 text-sm font-semibold text-white">{formatDate(date)}</h3></div>
            <span className="text-[10px] text-slate-500">{dayReports.filter((report) => report.reportType !== 'id-card').length} laporan shift · {dayReports.reduce((count, report) => count + report.structuredData.cardIncidents.length, 0)} temuan ID card</span>
          </header>
          <div className="divide-y divide-white/[0.06]">
            {dayReports.map((report) => <DailyReportCard key={report.id} report={report} />)}
          </div>
        </section>
      ))}
    </div>
  )
}

function DailyReportCard({ report }: { report: MonthlyReportRecord }) {
  const data = report.structuredData
  const reportKind = report.reportType === 'id-card' ? 'Monitoring kartu ID' : report.reportType === 'combined' ? 'Jaga + kartu ID' : 'Tugas jaga'
  const posts = [
    ['Pos 1', data.staffing.pos1], ['Pos 2', data.staffing.pos2], ['Pos 3', data.staffing.pos3],
    ['Patroli', data.staffing.patrol], ['Lobby', data.staffing.lobby], ['Basement', data.staffing.basement],
  ] as const

  return (
    <article className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-white/[0.07] px-2.5 py-1 text-xs font-semibold text-white">{report.shift ? `Shift ${report.shift}` : 'Harian'}</span>{report.team ? <span className="text-xs text-slate-300">Regu {report.team}</span> : null}<span className="rounded-full bg-lime-300/10 px-2 py-1 text-[10px] text-lime-100">{reportKind}</span></div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] ${data.attendanceStatus === 'Lengkap' ? 'bg-lime-300/10 text-lime-200' : 'bg-amber-300/10 text-amber-100'}`}>{report.reportType === 'id-card' ? `${data.cardIncidents.length} temuan ID card` : data.attendanceStatus}</span>
      </div>

      {report.reportType !== 'id-card' ? <>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{posts.filter(([, names]) => names.length > 0).map(([label, names]) => <div key={label} className="min-w-0 rounded-lg bg-white/[0.025] px-3 py-2"><p className="text-[9px] uppercase tracking-wide text-slate-600">{label}</p><p className="mt-1 text-[11px] leading-5 text-slate-300">{names.join(', ')}</p></div>)}</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3"><Mini label="Personel dilaporkan" value={data.attendance.reportedCount ?? '—'} /><Mini label="Nama roster" value={data.attendance.roster.length} /><Mini label="Kehadiran" value={data.attendanceStatus} /></div>
        {data.attendance.absentNames.length > 0 ? <p className="mt-2 text-[10px] text-amber-100">Tidak hadir: {data.attendance.absentNames.join(', ')}</p> : null}
        {data.tasks.length > 0 ? <div className="mt-3 border-t border-white/[0.06] pt-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Tugas & aktivitas</p><ul className="mt-1 flex flex-col gap-1">{data.tasks.slice(0, 5).map((task, index) => <li key={`${task.task}-${index}`} className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[10px]"><span className="text-slate-300">{task.task}{task.assignee ? ` · ${task.assignee}` : ''}</span><span className="text-slate-500">{task.status}</span></li>)}</ul></div> : null}
        {data.cleanedNarrative ? <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-[10px] leading-5 text-slate-500">{data.cleanedNarrative}</p> : null}
      </> : null}

      {data.cardIncidents.length > 0 ? <div className="mt-3 border-t border-white/[0.06] pt-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Karyawan tanpa ID card</p><div className="mt-2 flex flex-wrap gap-1.5">{data.cardIncidents.map((incident, index) => <span key={`${incident.employeeName}-${index}`} className="rounded-full border border-white/[0.08] px-2 py-1 text-[10px] text-slate-300">{incident.employeeName} · {incident.status}</span>)}</div></div> : null}
    </article>
  )
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-lg border border-white/[0.06] px-2.5 py-2"><p className="text-[9px] uppercase tracking-wide text-slate-600">{label}</p><p className="mt-1 text-[11px] font-medium text-slate-200">{value}</p></div>
}
