import { and, asc, eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { PortalHeader } from '@/components/portal-header'
import { ReportPrintActions } from '@/components/report-print-actions'
import { requireAppUser } from '@/lib/authz'
import { db } from '@/lib/db'
import { aiGuardReports, employeeIdCardIncidents, visitorRecords } from '@/lib/db/schema'
import { formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function ReportPrintPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const current = await requireAppUser('admin')
  const { id = '' } = await searchParams
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const [report] = await db.select().from(aiGuardReports)
    .where(and(eq(aiGuardReports.id, id), eq(aiGuardReports.userId, current.workspaceId)))
    .limit(1)
  if (!report) notFound()

  const [incidents, visitorRows] = await Promise.all([
    db.select().from(employeeIdCardIncidents)
      .where(and(eq(employeeIdCardIncidents.userId, current.workspaceId), eq(employeeIdCardIncidents.reportId, report.id)))
      .orderBy(asc(employeeIdCardIncidents.employeeName)),
    db.select({ guestCount: visitorRecords.guestCount }).from(visitorRecords)
      .where(and(eq(visitorRecords.userId, current.workspaceId), eq(visitorRecords.visitDate, report.reportDate))),
  ])
  const data = report.structuredData
  const visitorTotal = visitorRows.reduce((total, row) => total + (Number.parseInt(row.guestCount, 10) || 0), 0)

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-slate-950 print:min-h-0 print:bg-white">
      <div className="print:hidden"><PortalHeader user={current} section="Ekspor laporan" /></div>
      <article className="mx-auto my-8 max-w-[900px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 print:my-0 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Laporan Informasi</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">Laporan Operasional Keamanan</h1>
            <p className="mt-1 text-sm text-slate-600">{data.company || 'Operasional keamanan'} · {formatMaybeDate(data.documentDate) || formatDate(report.reportDate)}</p>
          </div>
          <ReportPrintActions />
        </div>

        {data.greeting ? <p className="mt-4 text-sm">{data.greeting}</p> : null}
        {(data.recipient || data.recipientTitle) ? <section className="mt-3 text-sm leading-6"><p>Kepada Yth. {data.recipient || '—'}</p>{data.recipientTitle ? <p>{data.recipientTitle}</p> : null}<p>Di tempat.</p></section> : null}

        <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 border-y border-slate-200 py-4 text-sm sm:grid-cols-4">
          <PrintField label="Hari" value={data.reportDay || getWeekday(report.reportDate)} />
          <PrintField label="Tgl" value={formatDate(report.reportDate)} />
          <PrintField label="Shift / Regu" value={report.shift ? `Shift ${report.shift}${report.team ? ` · Regu ${report.team}` : ''}` : 'Pemantauan kartu ID'} />
          <PrintField label="Jam" value={report.reportType === 'id-card' ? '—' : data.shiftHours || '—'} />
          <PrintField label="Pelapor" value={data.reporter || '—'} />
          <PrintField label="Situasi" value={data.situation || '—'} />
          <PrintField label="Lalu lintas" value={data.traffic || '—'} />
          <PrintField label="Cuaca" value={data.weather || '—'} />
          <PrintField label="Status hadir" value={report.reportType === 'id-card' ? '—' : data.attendanceStatus} />
        </dl>

        <p className="mt-5 text-sm leading-6">{report.reportType === 'id-card' ? 'Dengan hormat, berikut kami sampaikan rekap pemantauan karyawan tanpa kartu ID.' : 'Dengan hormat, bersama ini kami melaporkan hasil kegiatan petugas jaga sebagai berikut.'}</p>
        {data.cleanedNarrative ? <section className="mt-4"><h2 className="text-sm font-semibold">Ringkasan laporan</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{data.cleanedNarrative}</p></section> : null}

        {report.reportType !== 'id-card' ? <section className="mt-6">
          <h2 className="border-b border-slate-200 pb-2 text-base font-semibold">Kehadiran dan penempatan personel</h2>
          <p className="mt-2 text-sm">Jumlah yang dilaporkan: {data.attendance.reportedCount ?? '—'} · Hadir: {data.attendance.presentCount ?? '—'} · Tidak hadir: {data.attendance.absentCount ?? '—'}</p>
          {data.attendance.notes.length ? <p className="mt-1 text-sm text-slate-600">{data.attendance.notes.join(' · ')}</p> : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {Object.entries(data.staffing).filter(([, names]) => names.length > 0).map(([post, names]) => <div key={post} className="rounded-lg border border-slate-200 p-3"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{postLabel(post)}</h3><p className="mt-1 text-sm">{names.join(', ')}</p></div>)}
          </div>
          {data.attendance.absentNames.length ? <p className="mt-3 text-sm"><strong>Tidak hadir:</strong> {data.attendance.absentNames.join(', ')}</p> : null}
          {data.attendance.replacements.length ? <p className="mt-1 text-sm"><strong>Pengganti:</strong> {data.attendance.replacements.join(', ')}</p> : null}
        </section> : null}

        {report.reportType !== 'id-card' ? <>
          <section className="mt-6">
            <h2 className="border-b border-slate-200 pb-2 text-base font-semibold">Kegiatan dan pemantauan tugas</h2>
            {data.tasks.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{data.tasks.map((task, index) => <li key={`${task.task}-${index}`}>{task.task}{task.assignee ? ` — ${task.assignee}` : ''} ({task.status})</li>)}</ul> : <p className="mt-3 text-sm text-slate-500">{data.activities.join(' · ') || 'Tidak ada kegiatan tercatat.'}</p>}
            {data.overtime.length ? <p className="mt-3 text-sm"><strong>Lembur:</strong> {data.overtime.join(' · ')}</p> : null}
          </section>

          <section className="mt-6">
            <h2 className="border-b border-slate-200 pb-2 text-base font-semibold">Rencana shift berikutnya dan kartu parkir</h2>
            {data.nextShiftPlan.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{data.nextShiftPlan.map((person, index) => <li key={`${person.name}-${index}`}>{person.name}{person.assignment ? ` — ${person.assignment}` : ''}</li>)}</ul> : <p className="mt-3 text-sm text-slate-500">Rencana berikutnya tidak dicantumkan.</p>}
            <p className="mt-2 text-sm">Kartu parkir: mobil {data.parkingCards.cars ?? '—'} · motor {data.parkingCards.motorcycles ?? '—'} · cadangan {data.parkingCards.reserve ?? '—'}</p>
          </section>

          <section className="mt-6">
            <h2 className="border-b border-slate-200 pb-2 text-base font-semibold">Kendaraan menginap</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <VehicleBlock title="Motor karyawan" rows={data.vehicles.motorcycles} total={data.vehicles.totalMotorcycles} />
              <VehicleBlock title="Mobil" rows={data.vehicles.cars} total={data.vehicles.totalCars} />
            </div>
            {data.vehicles.operationalVehicles !== null ? <p className="mt-2 text-sm">Kendaraan operasional: {data.vehicles.operationalVehicles} unit</p> : null}
          </section>
        </> : null}

        <section className="mt-6">
          <h2 className="border-b border-slate-200 pb-2 text-base font-semibold">Pemantauan karyawan tanpa ID card</h2>
          {incidents.length ? (
            <table className="mt-3 w-full border-collapse text-sm"><thead><tr className="border-b border-slate-300 text-left"><th className="py-2 pr-3">No.</th><th className="py-2 pr-3">Nama</th><th className="py-2 pr-3">Departemen</th><th className="py-2">Status</th></tr></thead><tbody>{incidents.map((incident, index) => <tr key={incident.id} className="border-b border-slate-100"><td className="py-2 pr-3">{index + 1}</td><td className="py-2 pr-3">{incident.employeeName}</td><td className="py-2 pr-3">{incident.department || '—'}</td><td className="py-2">{incident.status}</td></tr>)}</tbody></table>
          ) : <p className="mt-3 text-sm text-slate-500">Tidak ada temuan kartu ID pada laporan ini.</p>}
          <p className="mt-3 text-sm">Total {incidents.length} orang · Belum ada {incidents.filter((item) => item.status === 'Belum ada').length} · Tertinggal {incidents.filter((item) => item.status === 'Tertinggal').length} · Rusak {incidents.filter((item) => item.status === 'Rusak').length}</p>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          {report.reportType !== 'id-card' ? <PrintList title="Serah terima inventaris" items={data.inventoryHandover} /> : null}
          {report.reportType !== 'id-card' ? <PrintList title="Pembaruan pintu akses" items={data.gateUpdates.map((item) => `${item.gate}: ${item.status}`)} /> : null}
          <PrintList title="Temuan" items={data.findings} />
          <div className="rounded-lg border border-slate-200 p-3"><h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tamu tercatat</h2><p className="mt-1 text-sm">{visitorRows.length} kunjungan · {visitorTotal} orang dari arsip buku tamu</p>{data.visitorNotes ? <p className="mt-1 text-xs text-slate-600">{data.visitorNotes}</p> : null}</div>
        </section>

        {data.missingInformation.length ? <section className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm"><h2 className="font-semibold">Catatan verifikasi</h2><ul className="mt-1 list-disc pl-5">{data.missingInformation.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section> : null}

        <div className="mt-10 grid grid-cols-2 gap-6 text-center text-sm"><div><p>Hormat kami,</p><p className="mt-16 font-semibold">{data.reporter || 'Petugas jaga'}</p><p>Danru / Pelapor</p></div><div><p>{data.cc.length ? 'CC:' : 'Diketahui,'}</p>{data.cc.length ? <ul className="mt-2 text-left text-xs">{data.cc.map((person, index) => <li key={`${person}-${index}`}>{index + 1}. {person}</li>)}</ul> : <p className="mt-16 font-semibold">Pimpinan</p>}</div></div>
        <p className="mt-8 border-t border-slate-200 pt-3 text-[10px] text-slate-500">Dibuat dari draf AI dan ditinjau admin · {formatDate(report.reportDate)}</p>
      </article>
    </main>
  )
}

function PrintField({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-0.5 font-medium text-slate-900">{value}</dd></div>
}

function VehicleBlock({ title, rows, total }: { title: string; rows: Array<{ location: string; count: number }>; total: number | null }) {
  return <div className="rounded-lg border border-slate-200 p-3"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title} · Total {total ?? '—'} unit</h3>{rows.length ? <ul className="mt-2 space-y-1 text-sm">{rows.map((row, index) => <li key={`${row.location}-${index}`} className="flex justify-between gap-3"><span>{row.location}</span><span>{row.count} unit</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Belum ada rincian lokasi.</p>}</div>
}

function PrintList({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-lg border border-slate-200 p-3"><h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>{items.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p className="mt-1 text-sm text-slate-500">Nihil / tidak dicantumkan.</p>}</div>
}

function postLabel(value: string) {
  const labels: Record<string, string> = { pos1: 'Pos 1', pos2: 'Pos 2', pos3: 'Pos 3', patrol: 'Patroli', lobby: 'Lobi', basement: 'Basement', other: 'Lainnya' }
  return labels[value] ?? value
}

function formatMaybeDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return ''
  return formatDate(value)
}

function getWeekday(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(new Date(year, month - 1, day))
}
