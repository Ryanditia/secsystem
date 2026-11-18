import { z } from 'zod'

const optionalCount = z.number().int().min(0).nullable()
const reportLines = z.array(z.string().trim().max(500)).max(100)

export const idCardStatusSchema = z.enum(['Belum ada', 'Tertinggal', 'Rusak'])
export type IdCardStatus = z.infer<typeof idCardStatusSchema>

export const guardReportDraftSchema = z.object({
  reportDate: z.string().max(10).describe('Tanggal operasi laporan dalam format YYYY-MM-DD. Kosongkan jika tidak ada tanggal di pesan.'),
  documentDate: z.string().max(10).describe('Tanggal kop surat dalam format YYYY-MM-DD jika ada; jika hanya satu tanggal, salin reportDate; jika tidak ada, kosongkan.'),
  reportDay: z.string().trim().max(30).describe('Nama hari untuk tanggal operasi, misalnya Selasa.'),
  greeting: z.string().trim().max(60).describe('Salam pembuka yang tertulis, misalnya Selamat Pagi.'),
  shift: z.enum(['I', 'II', 'III']).nullable(),
  team: z.enum(['A', 'B', 'C', 'D']).nullable(),
  shiftHours: z.string().trim().max(60),
  company: z.string().trim().max(180),
  recipient: z.string().trim().max(180),
  recipientTitle: z.string().trim().max(180),
  reporter: z.string().trim().max(160),
  attendanceStatus: z.enum(['Lengkap', 'Kurang personel', 'Tidak lengkap', 'Perlu verifikasi']),
  attendance: z.object({
    reportedCount: optionalCount,
    presentCount: optionalCount,
    absentCount: optionalCount,
    roster: z.array(z.object({ name: z.string().trim().max(120), assignment: z.string().trim().max(120) })).max(100),
    absentNames: reportLines,
    replacements: reportLines,
    notes: reportLines,
  }),
  staffing: z.object({
    pos1: reportLines,
    pos2: reportLines,
    pos3: reportLines,
    patrol: reportLines,
    lobby: reportLines,
    basement: reportLines,
    other: reportLines,
  }),
  tasks: z.array(z.object({
    task: z.string().trim().max(500),
    assignee: z.string().trim().max(120),
    status: z.enum(['Selesai', 'Berjalan', 'Perlu tindak lanjut', 'Tidak disebut']),
  })).max(100),
  vehicles: z.object({
    motorcycles: z.array(z.object({ location: z.string().trim().max(120), count: z.number().int().min(0) })).max(100),
    cars: z.array(z.object({ location: z.string().trim().max(120), count: z.number().int().min(0) })).max(100),
    totalMotorcycles: optionalCount,
    totalCars: optionalCount,
    operationalVehicles: optionalCount,
  }),
  cardIncidents: z.array(z.object({
    employeeName: z.string().trim().min(1).max(160),
    department: z.string().trim().max(120),
    status: idCardStatusSchema,
    details: z.string().trim().max(300),
  })).max(300),
  situation: z.string().trim().max(120),
  traffic: z.string().trim().max(120),
  weather: z.string().trim().max(120),
  inventoryHandover: reportLines,
  overtime: reportLines,
  nextShiftPlan: z.array(z.object({ name: z.string().trim().max(120), assignment: z.string().trim().max(120) })).max(100),
  parkingCards: z.object({ cars: optionalCount, motorcycles: optionalCount, reserve: optionalCount }),
  visitorNotes: z.string().trim().max(2000),
  activities: reportLines,
  findings: reportLines,
  gateUpdates: z.array(z.object({ gate: z.string().trim().max(120), status: z.string().trim().max(120) })).max(50),
  cc: reportLines,
  missingInformation: reportLines,
  cleanedNarrative: z.string().trim().max(6000),
})

export type GuardReportDraft = z.infer<typeof guardReportDraftSchema>
export type AiReportType = 'shift' | 'id-card' | 'combined'
