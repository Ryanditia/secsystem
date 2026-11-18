import ExcelJS from 'exceljs'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aiGuardReports, employeeIdCardIncidents, visitorRecords } from '@/lib/db/schema'
import { formatDate } from '@/lib/format'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { getAppUser } = await import('@/lib/authz')
  const current = await getAppUser()
  if (!current) return new Response('Unauthorized', { status: 401 })
  if (current.role !== 'admin') return new Response('Forbidden', { status: 403 })

  const reportId = new URL(request.url).searchParams.get('id') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(reportId)) return new Response('Invalid report', { status: 400 })

  const [report] = await db.select().from(aiGuardReports)
    .where(and(eq(aiGuardReports.id, reportId), eq(aiGuardReports.userId, current.workspaceId)))
    .limit(1)
  if (!report) return new Response('Report not found', { status: 404 })

  const [incidents, visitorRows] = await Promise.all([
    db.select().from(employeeIdCardIncidents)
      .where(and(eq(employeeIdCardIncidents.userId, current.workspaceId), eq(employeeIdCardIncidents.reportId, report.id)))
      .orderBy(employeeIdCardIncidents.employeeName),
    db.select({ guestCount: visitorRecords.guestCount }).from(visitorRecords)
      .where(and(eq(visitorRecords.userId, current.workspaceId), eq(visitorRecords.visitDate, report.reportDate))),
  ])

  const data = report.structuredData
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'SecSystem'
  workbook.created = new Date()
  workbook.subject = 'Laporan operasional keamanan'
  workbook.title = `Laporan ${report.reportDate}`

  const summary = workbook.addWorksheet('Ringkasan')
  summary.columns = [{ header: 'Informasi', key: 'label', width: 30 }, { header: 'Nilai', key: 'value', width: 58 }]
  summary.addRows([
    { label: 'Tanggal kop', value: data.documentDate || formatDate(report.reportDate) },
    { label: 'Hari laporan', value: data.reportDay || '—' },
    { label: 'Salam pembuka', value: data.greeting || '—' },
    { label: 'Tanggal laporan', value: formatDate(report.reportDate) },
    { label: 'Jenis laporan', value: report.reportType === 'combined' ? 'Jaga dan kartu ID' : report.reportType === 'id-card' ? 'Pemantauan kartu ID' : 'Laporan jaga' },
    { label: 'Shift', value: report.shift ?? '—' },
    { label: 'Regu', value: report.team ?? '—' },
    { label: 'Jam jaga', value: data.shiftHours || '—' },
    { label: 'Status kehadiran', value: data.attendanceStatus },
    { label: 'Jumlah dilaporkan', value: data.attendance.reportedCount ?? '—' },
    { label: 'Nama di roster', value: data.attendance.roster.length },
    { label: 'Jumlah hadir', value: data.attendance.presentCount ?? '—' },
    { label: 'Jumlah tidak hadir', value: data.attendance.absentCount ?? '—' },
    { label: 'Situasi', value: data.situation || '—' },
    { label: 'Lalu lintas', value: data.traffic || '—' },
    { label: 'Cuaca', value: data.weather || '—' },
    { label: 'Total motor', value: data.vehicles.totalMotorcycles ?? '—' },
    { label: 'Total mobil', value: data.vehicles.totalCars ?? '—' },
    { label: 'Kendaraan operasional', value: data.vehicles.operationalVehicles ?? '—' },
    { label: 'Kartu parkir mobil', value: data.parkingCards.cars ?? '—' },
    { label: 'Kartu parkir motor', value: data.parkingCards.motorcycles ?? '—' },
    { label: 'Kartu parkir cadangan', value: data.parkingCards.reserve ?? '—' },
    { label: 'Kunjungan dalam arsip buku tamu', value: visitorRows.length },
    { label: 'Orang tercatat dalam buku tamu', value: visitorRows.reduce((total, row) => total + (Number.parseInt(row.guestCount, 10) || 0), 0) },
    { label: 'Pelapor', value: data.reporter || '—' },
    { label: 'Catatan tamu/proyek', value: data.visitorNotes || '—' },
    { label: 'Narasi', value: data.cleanedNarrative || '—' },
  ])

  const attendance = workbook.addWorksheet('Kehadiran dan Pos')
  attendance.columns = [{ header: 'Nama', key: 'name', width: 30 }, { header: 'Penugasan', key: 'assignment', width: 36 }, { header: 'Keterangan', key: 'notes', width: 44 }]
  if (data.attendance.roster.length > 0) {
    attendance.addRows(data.attendance.roster.map((person) => ({ name: person.name, assignment: person.assignment, notes: '' })))
  } else {
    for (const [label, names] of Object.entries(data.staffing)) {
      for (const name of names) attendance.addRow({ name, assignment: label, notes: '' })
    }
  }
  for (const name of data.attendance.absentNames) attendance.addRow({ name, assignment: '', notes: 'Tidak hadir' })
  for (const name of data.attendance.replacements) attendance.addRow({ name, assignment: '', notes: 'Pengganti' })
  if (data.attendance.notes.length) data.attendance.notes.forEach((note) => attendance.addRow({ name: '', assignment: '', notes: note }))

  const vehicles = workbook.addWorksheet('Kendaraan')
  vehicles.columns = [{ header: 'Jenis', key: 'type', width: 22 }, { header: 'Lokasi', key: 'location', width: 36 }, { header: 'Jumlah', key: 'count', width: 14 }]
  data.vehicles.motorcycles.forEach((row) => vehicles.addRow({ type: 'Motor', location: row.location, count: row.count }))
  data.vehicles.cars.forEach((row) => vehicles.addRow({ type: 'Mobil', location: row.location, count: row.count }))
  if (data.vehicles.operationalVehicles !== null) vehicles.addRow({ type: 'Operasional', location: 'Kendaraan operasional', count: data.vehicles.operationalVehicles })
  vehicles.addRow({ type: 'Total motor', location: '', count: data.vehicles.totalMotorcycles ?? '' })
  vehicles.addRow({ type: 'Total mobil', location: '', count: data.vehicles.totalCars ?? '' })

  const tasks = workbook.addWorksheet('Tugas Anggota')
  tasks.columns = [{ header: 'Tugas / kegiatan', key: 'task', width: 62 }, { header: 'Penanggung jawab', key: 'assignee', width: 28 }, { header: 'Status', key: 'status', width: 24 }]
  tasks.addRows(data.tasks.map((task) => ({ task: task.task, assignee: task.assignee || '—', status: task.status })))
  data.activities.forEach((activity) => tasks.addRow({ task: activity, assignee: '', status: 'Tidak disebut' }))

  const nextShift = workbook.addWorksheet('Rencana Shift')
  nextShift.columns = [{ header: 'Nama personel', key: 'name', width: 32 }, { header: 'Penugasan', key: 'assignment', width: 42 }]
  nextShift.addRows(data.nextShiftPlan.map((person) => ({ name: person.name, assignment: person.assignment || '—' })))
  if (data.nextShiftPlan.length === 0) nextShift.addRow({ name: 'Tidak dicantumkan', assignment: '—' })

  const idCards = workbook.addWorksheet('Monitoring Kartu ID')
  idCards.columns = [{ header: 'Nama karyawan', key: 'employeeName', width: 32 }, { header: 'Departemen', key: 'department', width: 26 }, { header: 'Status', key: 'status', width: 22 }, { header: 'Detail', key: 'details', width: 42 }]
  idCards.addRows(incidents.map((incident) => ({ employeeName: incident.employeeName, department: incident.department || '—', status: incident.status, details: incident.details || '—' })))
  idCards.addRow({ employeeName: 'Total temuan', department: incidents.length, status: `Belum ada: ${incidents.filter((item) => item.status === 'Belum ada').length}; Tertinggal: ${incidents.filter((item) => item.status === 'Tertinggal').length}; Rusak: ${incidents.filter((item) => item.status === 'Rusak').length}`, details: '' })

  const inventory = workbook.addWorksheet('Inventaris dan Temuan')
  inventory.columns = [{ header: 'Bagian', key: 'section', width: 28 }, { header: 'Isi', key: 'content', width: 90 }]
  data.inventoryHandover.forEach((item) => inventory.addRow({ section: 'Serah terima inventaris', content: item }))
  inventory.addRow({ section: 'Kartu parkir mobil', content: data.parkingCards.cars ?? 'Belum disebut' })
  inventory.addRow({ section: 'Kartu parkir motor', content: data.parkingCards.motorcycles ?? 'Belum disebut' })
  inventory.addRow({ section: 'Kartu parkir cadangan', content: data.parkingCards.reserve ?? 'Belum disebut' })
  data.gateUpdates.forEach((item) => inventory.addRow({ section: `Pintu ${item.gate}`, content: item.status }))
  data.overtime.forEach((item) => inventory.addRow({ section: 'Lembur', content: item }))
  data.findings.forEach((item) => inventory.addRow({ section: 'Temuan', content: item }))
  data.missingInformation.forEach((item) => inventory.addRow({ section: 'Perlu verifikasi', content: item }))

  for (const sheet of workbook.worksheets) {
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF26332A' } }
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } }
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
  const filename = `laporan-keamanan-${report.reportDate}-${report.id.slice(0, 8)}.xlsx`
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
