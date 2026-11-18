import ExcelJS from 'exceljs'
import { and, asc, eq, gte, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aiGuardReports, employeeIdCardIncidents, visitorRecords } from '@/lib/db/schema'
import { buildDailyOperations, getMonthBounds, summarizeMonth } from '@/lib/monthly-recap'
import { formatDate } from '@/lib/format'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { getAppUser } = await import('@/lib/authz')
  const current = await getAppUser()
  if (!current) return new Response('Unauthorized', { status: 401 })
  if (current.role !== 'admin') return new Response('Forbidden', { status: 403 })

  const month = new URL(request.url).searchParams.get('month') ?? ''
  const bounds = getMonthBounds(month)
  if (!bounds) return new Response('Invalid month', { status: 400 })

  const [reports, incidents, visitors] = await Promise.all([
    db.select().from(aiGuardReports).where(and(
      eq(aiGuardReports.userId, current.workspaceId),
      gte(aiGuardReports.reportDate, bounds.startDate),
      lt(aiGuardReports.reportDate, bounds.nextMonth),
    )).orderBy(asc(aiGuardReports.reportDate), asc(aiGuardReports.shift), asc(aiGuardReports.team)).limit(1000),
    db.select().from(employeeIdCardIncidents).where(and(
      eq(employeeIdCardIncidents.userId, current.workspaceId),
      gte(employeeIdCardIncidents.reportDate, bounds.startDate),
      lt(employeeIdCardIncidents.reportDate, bounds.nextMonth),
    )).orderBy(asc(employeeIdCardIncidents.reportDate), asc(employeeIdCardIncidents.employeeName)).limit(3000),
    db.select({ visitDate: visitorRecords.visitDate, guestCount: visitorRecords.guestCount }).from(visitorRecords).where(and(
      eq(visitorRecords.userId, current.workspaceId),
      gte(visitorRecords.visitDate, bounds.startDate),
      lt(visitorRecords.visitDate, bounds.nextMonth),
    )).limit(10000),
  ])

  const daily = buildDailyOperations(month, reports, incidents, visitors)
  const summary = summarizeMonth(daily, reports)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'SecSystem'
  workbook.title = `Rekap tugas jaga ${month}`
  workbook.subject = 'Rekap tugas jaga harian dan KPI operasional'
  workbook.created = new Date()

  const summarySheet = workbook.addWorksheet('Ringkasan Bulanan')
  summarySheet.columns = [{ header: 'Indikator', key: 'name', width: 34 }, { header: 'Nilai', key: 'value', width: 28 }]
  summarySheet.addRows([
    { name: 'Periode', value: month },
    { name: 'Laporan shift masuk', value: summary.reportCount },
    { name: 'Target laporan shift', value: summary.expectedReports },
    { name: 'Cakupan laporan', value: `${summary.coveragePercent.toFixed(1)}%` },
    { name: 'Shift dengan kehadiran lengkap', value: summary.completeReports },
    { name: 'Kualitas kehadiran', value: summary.attendanceQualityPercent === null ? 'Belum ada data' : `${summary.attendanceQualityPercent.toFixed(1)}%` },
    { name: 'Person-shift dilaporkan', value: summary.personShifts },
    { name: 'Tugas selesai', value: summary.tasksCompleted },
    { name: 'Total tugas', value: summary.tasksTotal },
    { name: 'Kualitas penyelesaian tugas', value: summary.taskQualityPercent === null ? 'Belum ada data' : `${summary.taskQualityPercent.toFixed(1)}%` },
    { name: 'Temuan kartu ID', value: summary.cardIncidents },
    { name: 'Kunjungan di arsip buku tamu', value: summary.visitorVisits },
    { name: 'Tamu tercatat di buku tamu', value: summary.visitorGuests },
    { name: 'Hari dengan snapshot kendaraan', value: summary.vehicleDays },
  ])

  const recap = workbook.addWorksheet('Rekap Harian')
  recap.columns = [
    { header: 'Tanggal', key: 'date', width: 18 },
    { header: 'Jenis', key: 'kind', width: 18 },
    { header: 'Shift', key: 'shift', width: 12 },
    { header: 'Regu', key: 'team', width: 12 },
    { header: 'Kehadiran', key: 'attendance', width: 22 },
    { header: 'Jumlah dilaporkan', key: 'headcount', width: 18 },
    { header: 'Roster nama', key: 'roster', width: 48 },
    { header: 'Pos 1', key: 'pos1', width: 34 },
    { header: 'Pos 2', key: 'pos2', width: 34 },
    { header: 'Pos 3', key: 'pos3', width: 34 },
    { header: 'Patroli / Lobby / Basement', key: 'coverage', width: 48 },
    { header: 'Kegiatan', key: 'activities', width: 90 },
    { header: 'Situasi / Lalin / Cuaca', key: 'conditions', width: 38 },
    { header: 'Lembur', key: 'overtime', width: 48 },
    { header: 'Tamu / Proyek', key: 'visitorNotes', width: 54 },
    { header: 'Temuan', key: 'findings', width: 50 },
    { header: 'Pelapor', key: 'reporter', width: 28 },
  ]
  recap.addRows(reports.map((report) => {
    const data = report.structuredData
    return {
      date: formatDate(report.reportDate),
      kind: report.reportType === 'id-card' ? 'Monitoring ID card' : report.reportType === 'combined' ? 'Jaga + ID card' : 'Tugas jaga',
      shift: report.shift ?? '—',
      team: report.team ?? '—',
      attendance: report.reportType === 'id-card' ? '—' : data.attendanceStatus,
      headcount: data.attendance.reportedCount ?? '—',
      roster: data.attendance.roster.map((person) => `${person.name} (${person.assignment || '—'})`).join('; '),
      pos1: data.staffing.pos1.join(', '),
      pos2: data.staffing.pos2.join(', '),
      pos3: data.staffing.pos3.join(', '),
      coverage: [`Patroli: ${data.staffing.patrol.join(', ') || '—'}`, `Lobby: ${data.staffing.lobby.join(', ') || '—'}`, `Basement: ${data.staffing.basement.join(', ') || '—'}`].join('\n'),
      activities: data.cleanedNarrative || data.activities.join('\n'),
      conditions: [data.situation, data.traffic, data.weather].filter(Boolean).join(' / '),
      overtime: data.overtime.join('; '),
      visitorNotes: data.visitorNotes,
      findings: data.findings.join('; '),
      reporter: data.reporter,
    }
  }))

  const staffing = workbook.addWorksheet('Kehadiran Personel')
  staffing.columns = [{ header: 'Tanggal', key: 'date', width: 18 }, { header: 'Shift / Regu', key: 'shiftTeam', width: 20 }, { header: 'Nama', key: 'name', width: 32 }, { header: 'Penempatan', key: 'assignment', width: 34 }, { header: 'Status', key: 'status', width: 22 }]
  for (const report of reports.filter((item) => item.reportType !== 'id-card')) {
    const data = report.structuredData
    for (const person of data.attendance.roster) staffing.addRow({ date: formatDate(report.reportDate), shiftTeam: `${report.shift ?? '—'} / ${report.team ?? '—'}`, name: person.name, assignment: person.assignment, status: 'Terdata' })
    for (const name of data.attendance.absentNames) staffing.addRow({ date: formatDate(report.reportDate), shiftTeam: `${report.shift ?? '—'} / ${report.team ?? '—'}`, name, assignment: '', status: 'Tidak hadir' })
    for (const name of data.attendance.replacements) staffing.addRow({ date: formatDate(report.reportDate), shiftTeam: `${report.shift ?? '—'} / ${report.team ?? '—'}`, name, assignment: '', status: 'Pengganti' })
  }

  const vehicles = workbook.addWorksheet('Kendaraan Menginap')
  vehicles.columns = [{ header: 'Tanggal', key: 'date', width: 18 }, { header: 'Jenis', key: 'type', width: 18 }, { header: 'Lokasi', key: 'location', width: 42 }, { header: 'Jumlah', key: 'count', width: 15 }]
  for (const report of reports.filter((item) => item.reportType !== 'id-card')) {
    const data = report.structuredData
    data.vehicles.motorcycles.forEach((item) => vehicles.addRow({ date: formatDate(report.reportDate), type: 'Motor', location: item.location, count: item.count }))
    data.vehicles.cars.forEach((item) => vehicles.addRow({ date: formatDate(report.reportDate), type: 'Mobil', location: item.location, count: item.count }))
    vehicles.addRow({ date: formatDate(report.reportDate), type: 'Total motor', location: '', count: data.vehicles.totalMotorcycles ?? '' })
    vehicles.addRow({ date: formatDate(report.reportDate), type: 'Total mobil', location: '', count: data.vehicles.totalCars ?? '' })
    if (data.vehicles.operationalVehicles !== null) vehicles.addRow({ date: formatDate(report.reportDate), type: 'Operasional', location: 'Kendaraan operasional', count: data.vehicles.operationalVehicles })
  }

  const tasks = workbook.addWorksheet('Tugas Anggota')
  tasks.columns = [{ header: 'Tanggal', key: 'date', width: 18 }, { header: 'Shift / Regu', key: 'shiftTeam', width: 20 }, { header: 'Tugas', key: 'task', width: 72 }, { header: 'PIC', key: 'assignee', width: 30 }, { header: 'Status', key: 'status', width: 24 }]
  for (const report of reports.filter((item) => item.reportType !== 'id-card')) {
    for (const task of report.structuredData.tasks) tasks.addRow({ date: formatDate(report.reportDate), shiftTeam: `${report.shift ?? '—'} / ${report.team ?? '—'}`, task: task.task, assignee: task.assignee || '—', status: task.status })
  }

  const cardRows = workbook.addWorksheet('Monitoring ID Card')
  cardRows.columns = [{ header: 'Tanggal', key: 'date', width: 18 }, { header: 'Nama karyawan', key: 'name', width: 34 }, { header: 'Departemen', key: 'department', width: 28 }, { header: 'Status', key: 'status', width: 20 }, { header: 'Catatan', key: 'details', width: 44 }]
  cardRows.addRows(incidents.map((incident) => ({ date: formatDate(incident.reportDate), name: incident.employeeName, department: incident.department || '—', status: incident.status, details: incident.details || '—' })))

  const dailySheet = workbook.addWorksheet('KPI Harian')
  dailySheet.columns = [{ header: 'Tanggal', key: 'date', width: 18 }, { header: 'Laporan shift', key: 'reports', width: 16 }, { header: 'Shift lengkap', key: 'complete', width: 16 }, { header: 'Person-shift', key: 'personnel', width: 16 }, { header: 'Motor', key: 'motorcycles', width: 14 }, { header: 'Mobil', key: 'cars', width: 14 }, { header: 'Temuan ID card', key: 'incidents', width: 16 }, { header: 'Kunjungan VISTA arsip', key: 'visits', width: 22 }, { header: 'Jumlah tamu', key: 'guests', width: 16 }, { header: 'Kualitas tugas', key: 'taskQuality', width: 18 }]
  dailySheet.addRows(daily.map((item) => ({ date: formatDate(item.date), reports: item.shiftReports, complete: item.completeReports, personnel: item.reportedPersonnel, motorcycles: item.vehiclesMotorcycles ?? '', cars: item.vehiclesCars ?? '', incidents: item.cardIncidents, visits: item.visitorVisits, guests: item.visitorGuests, taskQuality: item.taskQualityPercent === null ? '—' : `${item.taskQualityPercent.toFixed(1)}%` })))

  for (const sheet of workbook.worksheets) {
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF26332A' } }
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } }
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="rekap-tugas-jaga-${month}.xlsx"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
