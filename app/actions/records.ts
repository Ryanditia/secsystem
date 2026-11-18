'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireAppUser } from '@/lib/authz'
import { db } from '@/lib/db'
import { guardReports, visitorRecords } from '@/lib/db/schema'
import type { FormState } from '@/app/actions/accounts'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

export async function createVisitorRecord(_state: FormState, formData: FormData): Promise<FormState> {
  const current = await requireAppUser('admin')
  const parsed = z.object({
    visitDate: dateSchema,
    visitorName: z.string().trim().min(2).max(160),
    gender: z.enum(['Laki-laki', 'Perempuan', 'Lainnya']),
    arrivalTime: timeSchema,
    plannedDepartureTime: timeSchema,
    phone: z.string().trim().max(40).optional(),
    company: z.string().trim().max(180).optional(),
    address: z.string().trim().max(500).optional(),
    host: z.string().trim().max(160).optional(),
    purpose: z.string().trim().min(2).max(240),
    guestCount: z.string().regex(/^([1-9]\d{0,3})$/),
    visitorPassStatus: z.enum(['belum_diberikan', 'diberikan', 'dikembalikan']),
    visitStatus: z.enum(['terjadwal', 'sedang_berkunjung', 'selesai']),
    checkInTime: z.union([timeSchema, z.literal('')]),
    checkOutTime: z.union([timeSchema, z.literal('')]),
    securityInductionConfirmed: z.boolean(),
    notes: z.string().trim().max(1000).optional(),
  }).safeParse({
    visitDate: String(formData.get('visitDate') ?? ''),
    visitorName: String(formData.get('visitorName') ?? ''),
    gender: String(formData.get('gender') ?? ''),
    arrivalTime: String(formData.get('arrivalTime') ?? ''),
    plannedDepartureTime: String(formData.get('plannedDepartureTime') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    company: String(formData.get('company') ?? ''),
    address: String(formData.get('address') ?? ''),
    host: String(formData.get('host') ?? ''),
    purpose: String(formData.get('purpose') ?? ''),
    guestCount: String(formData.get('guestCount') ?? ''),
    visitorPassStatus: String(formData.get('visitorPassStatus') ?? ''),
    visitStatus: String(formData.get('visitStatus') ?? ''),
    checkInTime: String(formData.get('checkInTime') ?? ''),
    checkOutTime: String(formData.get('checkOutTime') ?? ''),
    securityInductionConfirmed: formData.get('securityInductionConfirmed') === 'on',
    notes: String(formData.get('notes') ?? ''),
  })

  if (!parsed.success) return { error: 'Periksa kembali tanggal, jam, jumlah tamu, dan kolom wajib.' }
  if (parsed.data.visitStatus !== 'terjadwal' && !parsed.data.checkInTime) {
    return { error: 'Isi jam check-in aktual untuk tamu yang sudah datang.' }
  }
  if (parsed.data.visitStatus === 'selesai' && !parsed.data.checkOutTime) {
    return { error: 'Isi jam check-out aktual untuk kunjungan yang sudah selesai.' }
  }

  const { checkInTime, checkOutTime, ...visitor } = parsed.data
  const localTimestamp = (time: string) => new Date(`${visitor.visitDate}T${time}:00+07:00`)
  const checkedInAt = visitor.visitStatus === 'terjadwal' || !checkInTime ? null : localTimestamp(checkInTime)
  let checkedOutAt = visitor.visitStatus !== 'selesai' || !checkOutTime ? null : localTimestamp(checkOutTime)
  if (checkedInAt && checkedOutAt && checkedOutAt < checkedInAt) {
    checkedOutAt = new Date(checkedOutAt.getTime() + 24 * 60 * 60 * 1000)
  }

  try {
    await db.insert(visitorRecords).values({
      userId: current.workspaceId,
      createdByUserId: current.id,
      ...visitor,
      checkedInAt,
      checkedOutAt,
      visitorPassConfirmation: null,
    })
  } catch {
    return { error: 'Data tamu belum tersimpan. Periksa isian lalu coba lagi.' }
  }

  revalidatePath('/admin')
  revalidatePath('/supervisor')
  return { success: 'Data kunjungan berhasil disimpan.' }
}

export async function updateVisitorControl(formData: FormData) {
  const current = await requireAppUser('admin')
  const parsed = z.object({
    id: z.uuid(),
    visitStatus: z.enum(['terjadwal', 'sedang_berkunjung', 'selesai']),
    visitorPassStatus: z.enum(['belum_diberikan', 'diberikan', 'dikembalikan', 'tercatat_di_sheet']),
    checkInTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).or(z.literal('')),
    checkOutTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).or(z.literal('')),
  }).safeParse({
    id: String(formData.get('id') ?? ''),
    visitStatus: String(formData.get('visitStatus') ?? ''),
    visitorPassStatus: String(formData.get('visitorPassStatus') ?? ''),
    checkInTime: String(formData.get('checkInTime') ?? ''),
    checkOutTime: String(formData.get('checkOutTime') ?? ''),
  })

  if (!parsed.success) redirect('/admin?error=invalid-control#riwayat-tamu')

  const [record] = await db.select({
    id: visitorRecords.id,
    visitDate: visitorRecords.visitDate,
    visitStatus: visitorRecords.visitStatus,
    checkedInAt: visitorRecords.checkedInAt,
    checkedOutAt: visitorRecords.checkedOutAt,
  })
    .from(visitorRecords)
    .where(and(eq(visitorRecords.id, parsed.data.id), eq(visitorRecords.userId, current.workspaceId)))
    .limit(1)
  if (!record) redirect('/admin?error=record-not-found#riwayat-tamu')

  const statusChanged = parsed.data.visitStatus !== record.visitStatus
  if (parsed.data.visitStatus !== 'terjadwal' && !parsed.data.checkInTime && !record.checkedInAt && statusChanged) {
    redirect('/admin?error=check-in-required#riwayat-tamu')
  }
  if (parsed.data.visitStatus === 'selesai' && !parsed.data.checkOutTime && !record.checkedOutAt && statusChanged) {
    redirect('/admin?error=check-out-required#riwayat-tamu')
  }

  const localTimestamp = (time: string) => new Date(`${record.visitDate}T${time}:00+07:00`)
  const checkedInAt = parsed.data.visitStatus === 'terjadwal'
    ? null
    : parsed.data.checkInTime ? localTimestamp(parsed.data.checkInTime) : record.checkedInAt
  let checkedOutAt = parsed.data.visitStatus !== 'selesai'
    ? null
    : parsed.data.checkOutTime ? localTimestamp(parsed.data.checkOutTime) : record.checkedOutAt
  if (checkedInAt && checkedOutAt && checkedOutAt < checkedInAt) {
    checkedOutAt = new Date(checkedOutAt.getTime() + 24 * 60 * 60 * 1000)
  }

  await db.update(visitorRecords).set({
    visitStatus: parsed.data.visitStatus,
    visitorPassStatus: parsed.data.visitorPassStatus,
    checkedInAt,
    checkedOutAt,
    updatedAt: new Date(),
  }).where(and(eq(visitorRecords.id, record.id), eq(visitorRecords.userId, current.workspaceId)))

  revalidatePath('/admin')
  revalidatePath('/supervisor')
  redirect('/admin?updated=1#riwayat-tamu')
}

export async function createGuardReport(_state: FormState, formData: FormData): Promise<FormState> {
  const current = await requireAppUser('admin')
  const parsed = z.object({
    reportDate: dateSchema,
    shift: z.enum(['I', 'II', 'III']),
    team: z.enum(['A', 'B', 'C', 'D']),
    attendanceStatus: z.enum(['Lengkap', 'Kurang personel', 'Tidak lengkap']),
    attendanceNotes: z.string().trim().max(500),
    pos1: z.string().trim().max(500),
    pos2: z.string().trim().max(500),
    pos3: z.string().trim().max(500),
    patrol: z.string().trim().max(500),
    lobby: z.string().trim().max(500),
    basement: z.string().trim().max(500),
    activities: z.string().trim().max(3000),
    inventoryHandover: z.string().trim().max(1500),
    vehicleSummary: z.string().trim().max(500),
    situation: z.enum(['Aman', 'Waspada', 'Darurat']),
    traffic: z.enum(['Lancar', 'Padat', 'Terkendala']),
    weather: z.enum(['Cerah', 'Berawan', 'Hujan', 'Lainnya']),
    overtimeNotes: z.string().trim().max(1500),
    visitorProjectNotes: z.string().trim().max(2000),
    findings: z.string().trim().max(2000),
    reporter: z.string().trim().min(2).max(160),
  }).safeParse({
    reportDate: String(formData.get('reportDate') ?? ''),
    shift: String(formData.get('shift') ?? ''),
    team: String(formData.get('team') ?? ''),
    attendanceStatus: String(formData.get('attendanceStatus') ?? ''),
    attendanceNotes: String(formData.get('attendanceNotes') ?? ''),
    pos1: String(formData.get('pos1') ?? ''),
    pos2: String(formData.get('pos2') ?? ''),
    pos3: String(formData.get('pos3') ?? ''),
    patrol: String(formData.get('patrol') ?? ''),
    lobby: String(formData.get('lobby') ?? ''),
    basement: String(formData.get('basement') ?? ''),
    activities: String(formData.get('activities') ?? ''),
    inventoryHandover: String(formData.get('inventoryHandover') ?? ''),
    vehicleSummary: String(formData.get('vehicleSummary') ?? ''),
    situation: String(formData.get('situation') ?? ''),
    traffic: String(formData.get('traffic') ?? ''),
    weather: String(formData.get('weather') ?? ''),
    overtimeNotes: String(formData.get('overtimeNotes') ?? ''),
    visitorProjectNotes: String(formData.get('visitorProjectNotes') ?? ''),
    findings: String(formData.get('findings') ?? ''),
    reporter: String(formData.get('reporter') ?? ''),
  })

  if (!parsed.success) return { error: 'Periksa kembali tanggal, shift, regu, dan kolom wajib.' }

  const { pos1, pos2, pos3, patrol, lobby, basement, inventoryHandover, ...report } = parsed.data
  const staffing = { pos1, pos2, pos3, patrol, lobby, basement }
  const inventory = inventoryHandover
    .split(/[\n;]/)
    .map((item) => item.trim())
    .filter(Boolean)

  try {
    await db.insert(guardReports).values({
      userId: current.workspaceId,
      createdByUserId: current.id,
      ...report,
      staffing,
      inventoryHandover: inventory,
    }).onConflictDoUpdate({
      target: [guardReports.userId, guardReports.reportDate, guardReports.shift, guardReports.team],
      set: {
        ...report,
        createdByUserId: current.id,
        staffing,
        inventoryHandover: inventory,
        updatedAt: new Date(),
      },
    })
  } catch {
    return { error: 'Laporan belum tersimpan. Coba lagi atau periksa isian.' }
  }

  revalidatePath('/admin')
  revalidatePath('/supervisor')
  return { success: 'Laporan tugas jaga berhasil disimpan.' }
}
