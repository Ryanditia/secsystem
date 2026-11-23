import type { GuardReportDraft } from '@/lib/guard-report'
import type { AiReportType } from '@/lib/guard-report'

export type MonthlyReportRecord = {
  id: string
  reportDate: string
  reportType: AiReportType
  shift: string | null
  team: string | null
  createdAt: Date
  structuredData: GuardReportDraft
}

export type MonthlyIncidentRecord = {
  reportDate: string
  status: string
}

export type MonthlyVisitorRecord = {
  visitDate: string
  guestCount: string
}

export type DailyOperations = {
  date: string
  dayLabel: string
  shiftReports: number
  completeReports: number
  needsReviewReports: number
  reportedPersonnel: number
  namedPersonnel: number
  vehiclesMotorcycles: number | null
  vehiclesCars: number | null
  vehicleTotal: number | null
  cardIncidents: number
  tasksTotal: number
  tasksCompleted: number
  taskQualityPercent: number | null
  visitorVisits: number
  visitorGuests: number
}

export function getMonthBounds(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null
  const [year, monthNumber] = month.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const nextDate = new Date(Date.UTC(year, monthNumber, 1))
  const nextMonth = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}-01`
  return { month, startDate: `${month}-01`, nextMonth, daysInMonth }
}

export function buildDailyOperations(
  month: string,
  reports: MonthlyReportRecord[],
  incidents: MonthlyIncidentRecord[],
  visitors: MonthlyVisitorRecord[],
): DailyOperations[] {
  const bounds = getMonthBounds(month)
  if (!bounds) return []

  return Array.from({ length: bounds.daysInMonth }, (_, index) => {
    const day = String(index + 1).padStart(2, '0')
    const date = `${month}-${day}`
    const dayReports = reports.filter((report) => report.reportDate === date)
    const shiftReports = dayReports.filter((report) => report.reportType !== 'id-card')
    const vehicleReport = shiftReports.find((report) => report.structuredData.vehicles.totalMotorcycles !== null
      || report.structuredData.vehicles.totalCars !== null
      || report.structuredData.vehicles.motorcycles.length > 0
      || report.structuredData.vehicles.cars.length > 0)
    const motorcycleTotal = vehicleReport
      ? vehicleReport.structuredData.vehicles.totalMotorcycles ?? sum(vehicleReport.structuredData.vehicles.motorcycles.map((item) => item.count))
      : null
    const carTotal = vehicleReport
      ? vehicleReport.structuredData.vehicles.totalCars ?? sum(vehicleReport.structuredData.vehicles.cars.map((item) => item.count))
      : null
    const dayTasks = shiftReports.flatMap((report) => report.structuredData.tasks)
    const dayVisitors = visitors.filter((visitor) => visitor.visitDate === date)

    return {
      date,
      dayLabel: day,
      shiftReports: shiftReports.length,
      completeReports: shiftReports.filter((report) => report.structuredData.attendanceStatus === 'Lengkap').length,
      needsReviewReports: shiftReports.filter((report) => report.structuredData.attendanceStatus !== 'Lengkap').length,
      reportedPersonnel: shiftReports.reduce((total, report) => total + (report.structuredData.attendance.reportedCount ?? 0), 0),
      namedPersonnel: shiftReports.reduce((total, report) => total + report.structuredData.attendance.roster.length, 0),
      vehiclesMotorcycles: motorcycleTotal,
      vehiclesCars: carTotal,
      vehicleTotal: motorcycleTotal === null && carTotal === null ? null : (motorcycleTotal ?? 0) + (carTotal ?? 0),
      cardIncidents: incidents.filter((incident) => incident.reportDate === date).length,
      tasksTotal: dayTasks.length,
      tasksCompleted: dayTasks.filter((task) => task.status === 'Selesai').length,
      taskQualityPercent: dayTasks.length > 0 ? dayTasks.filter((task) => task.status === 'Selesai').length / dayTasks.length * 100 : null,
      visitorVisits: dayVisitors.length,
      visitorGuests: dayVisitors.reduce((total, visitor) => total + (Number.parseInt(visitor.guestCount, 10) || 0), 0),
    }
  })
}

export function summarizeMonth(daily: DailyOperations[], reports: MonthlyReportRecord[]) {
  const shiftReports = reports.filter((report) => report.reportType !== 'id-card')
  const completeReports = shiftReports.filter((report) => report.structuredData.attendanceStatus === 'Lengkap').length
  const tasks = shiftReports.flatMap((report) => report.structuredData.tasks)
  const vehicleDays = daily.filter((day) => day.vehicleTotal !== null)
  return {
    reportCount: shiftReports.length,
    completeReports,
    expectedReports: daily.length * 12,
    coveragePercent: daily.length > 0 ? Math.min(shiftReports.length / (daily.length * 12) * 100, 100) : 0,
    attendanceQualityPercent: shiftReports.length > 0 ? completeReports / shiftReports.length * 100 : null,
    personShifts: shiftReports.reduce((total, report) => total + (report.structuredData.attendance.reportedCount ?? report.structuredData.attendance.roster.length), 0),
    tasksTotal: tasks.length,
    tasksCompleted: tasks.filter((task) => task.status === 'Selesai').length,
    taskQualityPercent: tasks.length > 0 ? tasks.filter((task) => task.status === 'Selesai').length / tasks.length * 100 : null,
    cardIncidents: reports.reduce((total, report) => total + report.structuredData.cardIncidents.length, 0),
    vehicleDays: vehicleDays.length,
    visitorVisits: daily.reduce((total, day) => total + day.visitorVisits, 0),
    visitorGuests: daily.reduce((total, day) => total + day.visitorGuests, 0),
  }
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}
