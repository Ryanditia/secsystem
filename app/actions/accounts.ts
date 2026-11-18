'use server'

import { and, eq, gt, isNull } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { guardReports, supervisorInvitations, user, visitorRecords } from '@/lib/db/schema'
import { hashInviteToken, createInviteToken } from '@/lib/invitations'
import { isNeonAuthConfigured } from '@/lib/auth-config'
import { requireAppUser } from '@/lib/authz'

export type FormState = {
  error?: string
  success?: string
  inviteUrl?: string
}

export async function claimFirstAdmin(): Promise<FormState> {
  if (!isNeonAuthConfigured()) return { error: 'Konfigurasi Neon Auth belum siap.' }
  const { data: session, error } = await auth.getSession()
  if (error || !session?.user || !session.user.emailVerified) {
    return { error: 'Verifikasi email admin terlebih dahulu.' }
  }

  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase()
  if (!initialAdminEmail || session.user.email.trim().toLowerCase() !== initialAdminEmail) {
    return { error: 'Akun ini bukan email admin awal yang dikonfigurasi.' }
  }

  const [existingAdmin] = await db.select({ id: user.id }).from(user).where(eq(user.role, 'admin')).limit(1)
  if (existingAdmin && existingAdmin.id !== session.user.id) {
    return { error: 'Admin awal sudah dibuat. Minta admin mengundang akun supervisor ini.' }
  }

  try {
    await db.transaction(async (transaction) => {
      const name = session.user.name?.trim() || session.user.email.split('@')[0]
      await transaction.insert(user).values({
        id: session.user.id,
        name,
        email: session.user.email.trim().toLowerCase(),
        emailVerified: true,
        role: 'admin',
        workspaceId: session.user.id,
      }).onConflictDoUpdate({
        target: user.id,
        set: {
          name,
          email: session.user.email.trim().toLowerCase(),
          emailVerified: true,
          role: 'admin',
          workspaceId: session.user.id,
          updatedAt: new Date(),
        },
      })

      await transaction.update(visitorRecords)
        .set({ userId: session.user.id, createdByUserId: session.user.id })
        .where(eq(visitorRecords.userId, '__bootstrap__'))

      await transaction.update(guardReports)
        .set({ userId: session.user.id, createdByUserId: session.user.id })
        .where(eq(guardReports.userId, '__bootstrap__'))
    })
  } catch {
    return { error: 'Akun admin tidak dapat diaktifkan. Coba lagi atau hubungi pengelola aplikasi.' }
  }

  revalidatePath('/')
  revalidatePath('/admin')
  return { success: 'Akun admin aktif.' }
}

function getRequestOrigin(requestHeaders: Headers) {
  if (process.env.NODE_ENV === 'production') {
    const deployment = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
    if (deployment) return `https://${deployment}`
  }

  const configuredPreview = process.env.V0_RUNTIME_URL ?? process.env.V0_DEV_APP_URL
  if (configuredPreview) return configuredPreview

  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'https'
  if (!host) throw new Error('Request host is unavailable')
  return `${protocol}://${host}`
}

export async function createSupervisorInvitation(_state: FormState, formData: FormData): Promise<FormState> {
  const current = await requireAppUser('admin')
  const emailResult = z.email().max(254).safeParse(String(formData.get('email') ?? '').trim().toLowerCase())
  if (!emailResult.success) return { error: 'Masukkan alamat email yang valid.' }

  const email = emailResult.data
  const [existingUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
  if (existingUser) return { error: 'Email tersebut sudah memiliki akun. Gunakan email supervisor lain.' }

  const [activeInvite] = await db.select({ id: supervisorInvitations.id })
    .from(supervisorInvitations)
    .where(and(
      eq(supervisorInvitations.userId, current.workspaceId),
      eq(supervisorInvitations.email, email),
      isNull(supervisorInvitations.acceptedAt),
      gt(supervisorInvitations.expiresAt, new Date()),
    ))
    .limit(1)
  if (activeInvite) return { error: 'Undangan aktif untuk email ini sudah ada.' }

  const token = createInviteToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await db.insert(supervisorInvitations).values({
    userId: current.workspaceId,
    createdByUserId: current.id,
    email,
    tokenHash: hashInviteToken(token),
    expiresAt,
  })

  const origin = getRequestOrigin(await headers())
  const inviteUrl = new URL('/accept-invite', origin)
  inviteUrl.searchParams.set('token', token)

  return { success: 'Undangan supervisor berhasil dibuat.', inviteUrl: inviteUrl.toString() }
}

export async function acceptSupervisorInvitation(token: string): Promise<FormState> {
  const normalizedToken = token.trim()
  if (!isNeonAuthConfigured() || normalizedToken.length < 32 || normalizedToken.length > 128) {
    return { error: 'Undangan tidak valid atau autentikasi belum siap.' }
  }

  const { data: session, error } = await auth.getSession()
  if (error || !session?.user || !session.user.emailVerified) {
    return { error: 'Masuk dan verifikasi email yang menerima undangan terlebih dahulu.' }
  }

  const tokenHash = hashInviteToken(normalizedToken)
  const now = new Date()
  const [invite] = await db.select()
    .from(supervisorInvitations)
    .where(and(
      eq(supervisorInvitations.tokenHash, tokenHash),
      eq(supervisorInvitations.email, session.user.email.trim().toLowerCase()),
      isNull(supervisorInvitations.acceptedAt),
      gt(supervisorInvitations.expiresAt, now),
    ))
    .limit(1)

  if (!invite) {
    const [existingProfile] = await db.select({ id: user.id, role: user.role, workspaceId: user.workspaceId })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1)
    if (existingProfile?.role === 'supervisor' && existingProfile.workspaceId) {
      return { success: 'Akun supervisor sudah aktif.' }
    }
    return { error: 'Undangan tidak cocok dengan email, sudah dipakai, atau sudah kedaluwarsa.' }
  }

  try {
    await db.transaction(async (transaction) => {
      const [claimed] = await transaction.update(supervisorInvitations)
        .set({ acceptedAt: new Date() })
        .where(and(
          eq(supervisorInvitations.id, invite.id),
          eq(supervisorInvitations.tokenHash, tokenHash),
          isNull(supervisorInvitations.acceptedAt),
          gt(supervisorInvitations.expiresAt, new Date()),
        ))
        .returning({ id: supervisorInvitations.id })
      if (!claimed) throw new Error('Invitation already claimed')

      await transaction.insert(user).values({
        id: session.user.id,
        name: session.user.name?.trim() || session.user.email.split('@')[0],
        email: session.user.email.trim().toLowerCase(),
        emailVerified: true,
        role: 'supervisor',
        workspaceId: invite.userId,
      }).onConflictDoUpdate({
        target: user.id,
        set: {
          name: session.user.name?.trim() || session.user.email.split('@')[0],
          email: session.user.email.trim().toLowerCase(),
          emailVerified: true,
          role: 'supervisor',
          workspaceId: invite.userId,
          updatedAt: new Date(),
        },
      })
    })
  } catch {
    return { error: 'Undangan tidak dapat diaktifkan. Minta admin membuat undangan baru.' }
  }

  revalidatePath('/supervisor')
  return { success: 'Akun supervisor aktif.' }
}
