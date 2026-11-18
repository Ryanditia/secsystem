import { and, asc, eq, gte, lt } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { ReportPrintActions } from '@/components/report-print-actions'
import { requireAppUser } from '@/lib/authz'
import { db } from '@/lib/db'
import { aiGuardReports, visitorRecords } from '@/lib/db/schema'
import { formatDate } from '@/lib/format'
import { getMonthBounds } from '@/lib/monthly-recap'

export const dynamic = 'force-dynamic'

export default async function MonthlyRecapPrintPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const current = await requireAppUser('admin')
  const { month = '' } = await searchParams
  const bounds = getMonthBounds(month)
  if (!bounds) notFound()

  const [reports, visitorRows] = await Promise.all([
    db.select().from(aiGuardReports).where(and(
      eq(aiGuardReports.userId, current.workspaceId),
      gte(aiGuardReports.reportDate, bounds.startDate),
      lt(aiGuardReports.reportDate, bounds.nextMonth),
    )).orderBy(asc(aiGuardReports.reportDate), asc(aiGuardReports.shift), asc(aiGuardReports.team)).limit(1000),
    db.select({ visitDate: visitorRecords.visitDate, guestCount: visitorRecords.guestCount }).from(visitorRecords).where(and(
      eq(visitorRecords.userId, current.workspaceId),
      gte(visitorRecords.visitDate, bounds.startDate),
      lt(visitorRecords.visitDate, bounds.nextMonth),
    )).limit(10000),
  ])
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(`${bounds.startDate}T12:00:00+07:00`))
  const visitorVisits = visitorRows.length
  const visitorGuests = visitorRows.reduce((total, row) => total + (Number.parseInt(row.guestCount, 10) || 0), 0)
  const letterhead = reports[0]?.structuredData
  const copyRecipients = [...new Set(reports.flatMap((report) => report.structuredData.cc).filter(Boolean))]

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <style>{'@page { size: A4 landscape; margin: 10mm; } @media print { html, body { background:#fff !important; color:#0f172a !important; } }'}</style>
      <div className="print:hidden mx-auto flex max-w-[1480px] items-center justify-between px-4 py-4 sm:px-7"><a href="/admin/rekap" className="text-xs text-slate-600 hover:text-slate-950">Kembali ke rekap</a><ReportPrintActions /></div>
      <article className="mx-auto max-w-[1480px] px-4 pb-10 sm:px-7 print:max-w-none print:px-0 print:pb-0">
        <header className="border-b-2 border-slate-900 pb-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.15em]">{letterhead?.company || 'SECURITY OPERATIONS'}</p>
          <h1 className="mt-2 text-xl font-bold">Rekap Tugas Jaga Harian</h1>
          <p className="mt-1 text-sm">Periode: {month}</p>
          {letterhead?.recipient || letterhead?.recipientTitle || copyRecipients.length ? <p className="mt-1 text-[10px] text-slate-600">{letterhead?.recipient ? `Kepada Yth. ${letterhead.recipient}` : ''}{letterhead?.recipientTitle ? ` (${letterhead.recipientTitle})` : ''}{copyRecipients.length ? ` · CC: ${copyRecipients.join(', ')}` : ''}</p> : null}
        </header>

        <div className="mt-4 grid grid-cols-4 gap-2 text-[10px]">
          <Summary label="Laporan shift" value={reports.filter((report) => report.reportType !== 'id-card').length} />
          <Summary label="Target laporan" value={bounds.daysInMonth * 12} />
          <Summary label="Kunjungan buku tamu" value={`${visitorVisits} kunjungan · ${visitorGuests} orang`} />
          <Summary label="Temuan kartu ID" value={reports.reduce((total, report) => total + report.structuredData.cardIncidents.length, 0)} />
        </div>

        {reports.length ? (
          <div className="mt-5 overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[1200px] border-collapse text-left text-[9px] leading-4 print:min-w-0 print:text-[8px] print:leading-[1.25]">
              <thead><tr className="bg-slate-100"><th className="border border-slate-400 p-1">No / Hari, tanggal</th><th className="border border-slate-400 p-1">Shift / Regu</th><th className="border border-slate-400 p-1">Kehadiran</th><th className="border border-slate-400 p-1">Pos 1 / 2 / 3</th><th className="border border-slate-400 p-1">Patroli / Lobby / Basement</th><th className="border border-slate-400 p-1">Kegiatan / Keterangan</th><th className="border border-slate-400 p-1">Situasi / Lalin / Cuaca</th><th className="border border-slate-400 p-1">Kendaraan</th><th className="border border-slate-400 p-1">Tamu / Proyek / Lembur</th><th className="border border-slate-400 p-1">Temuan / ID card / Pelapor</th></tr></thead>
              <tbody>{reports.map((report, index) => {
                const data = report.structuredData
                const cardSummary = data.cardIncidents.map((incident) => `${incident.employeeName} / ${incident.department} — ${incident.status}`).join('; ')
                const posts = [
                  `Pos 1: ${data.staffing.pos1.join(', ') || '—'}`,
                  `Pos 2: ${data.staffing.pos2.join(', ') || '—'}`,
                  `Pos 3: ${data.staffing.pos3.join(', ') || '—'}`,
                ].join('\n')
                const coverage = [
                  `Patroli: ${data.staffing.patrol.join(', ') || '—'}`,
                  `Lobby: ${data.staffing.lobby.join(', ') || '—'}`,
                  `Basement: ${data.staffing.basement.join(', ') || '—'}`,
                ].join('\n')
                const vehicleSummary = `Motor ${data.vehicles.totalMotorcycles ?? '—'} · Mobil ${data.vehicles.totalCars ?? '—'}${data.vehicles.operationalVehicles !== null ? ` · Operasional ${data.vehicles.operationalVehicles}` : ''}`
                return (
                  <tr key={report.id} className="align-top print:break-inside-avoid">
                    <td className="border border-slate-300 p-1">{index + 1}. {formatDate(report.reportDate)}{report.reportType === 'id-card' ? '\nLaporan ID card' : ''}</td>
                    <td className="border border-slate-300 p-1">{report.shift ? `${report.shift} / ${report.team ?? '—'}` : 'Harian'}</td>
                    <td className="border border-slate-300 p-1">{report.reportType === 'id-card' ? '—' : `${data.attendanceStatus}\nDilaporkan ${data.attendance.reportedCount ?? '—'} · roster ${data.attendance.roster.length}${data.attendance.absentNames.length ? `\nAbsen: ${data.attendance.absentNames.join(', ')}` : ''}`}</td>
                    <td className="whitespace-pre-wrap border border-slate-300 p-1">{report.reportType === 'id-card' ? '—' : posts}</td>
                    <td className="whitespace-pre-wrap border border-slate-300 p-1">{report.reportType === 'id-card' ? '—' : coverage}</td>
                    <td className="whitespace-pre-wrap border border-slate-300 p-1">{data.cleanedNarrative || data.activities.join('\n') || '—'}</td>
                    <td className="border border-slate-300 p-1">{[data.situation, data.traffic, data.weather].filter(Boolean).join(' / ') || '—'}</td>
                    <td className="border border-slate-300 p-1">{report.reportType === 'id-card' ? '—' : vehicleSummary}</td>
                    <td className="border border-slate-300 p-1">{[data.visitorNotes, ...data.overtime].filter(Boolean).join('\n') || 'Nihil'}</td>
                    <td className="border border-slate-300 p-1">{[...data.findings, cardSummary, data.reporter ? `Pelapor: ${data.reporter}` : ''].filter(Boolean).join('\n') || 'Nihil'}</td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        ) : <p className="mt-10 rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Belum ada laporan AI untuk periode ini.</p>}

        <footer className="mt-5 border-t border-slate-300 pt-3 text-[9px] text-slate-500">Dicetak dari SecSystem · Rekap hanya berisi laporan yang telah ditinjau dan disimpan oleh admin.</footer>
      </article>
    </main>
  )
}

function Summary({ label, value }: { label: string; value: number | string }) {
  return <div className="border border-slate-300 p-2"><p className="text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-900">{value}</p></div>
}
