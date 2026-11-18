'use server'

import { and, eq, gt, isNull } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { guardReports, supervisorInvitations, user, visitorRecords } from '@/lib/db/schema'
import { createInviteToken, hashInviteToken, isValidBootstrapToken } from '@/lib/invitations'
import { isAuthSecretStrong, isStrongSecret } from '@/lib/auth-config'
import { requireAppUser } from '@/lib/authz'

export type FormState = {
  error?: string
  success?: string
  inviteUrl?: string
}

const accountSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  password: z.string().min(12).max(128),
})

export async function createFirstAdmin(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = accountSchema.safeParse({
    name: formData.get('name'),
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: formData.get('password'),
  })
  const setupToken = String(formData.get('setupToken') ?? '')
  const expectedEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase()
  const expectedToken = process.env.INITIAL_ADMIN_SETUP_TOKEN

  if (!parsed.success || !expectedEmail || !expectedToken || !isStrongSecret(expectedToken) || !isAuthSecretStrong()) {
    return { error: 'Data setup tidak valid atau konfigurasi admin belum lengkap.' }
  }

  if (
    parsed.data.email !== expectedEmail ||
    !isValidBootstrapToken(setupToken, expectedToken)
  ) {
    return { error: 'Data setup tidak cocok. Periksa email dan token setup.' }
  }

  const [existingAdmin] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, 'admin'))
    .limit(1)

  if (existingAdmin) return { error: 'Setup admin awal sudah pernah digunakan.' }

  try {
    const result = await auth.api.signUpEmail({
      headers: await headers(),
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      },
    })

    await db.update(user)
      .set({ role: 'admin', workspaceId: result.user.id, emailVerified: true, updatedAt: new Date() })
      .where(eq(user.id, result.user.id))

    await db.update(visitorRecords)
      .set({ userId: result.user.id, createdByUserId: result.user.id })
      .where(eq(visitorRecords.userId, '__bootstrap__'))

    await db.update(guardReports)
      .set({ userId: result.user.id, createdByUserId: result.user.id })
      .where(eq(guardReports.userId, '__bootstrap__'))
  } catch {
    return { error: 'Setup tidak dapat diselesaikan. Pastikan email belum terdaftar lalu coba lagi.' }
  }

  revalidatePath('/')
  redirect('/admin')
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

export async function acceptSupervisorInvitation(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = accountSchema.safeParse({
    name: formData.get('name'),
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: formData.get('password'),
  })
  const token = String(formData.get('token') ?? '')
  if (!isAuthSecretStrong()) return { error: 'Login belum aktif karena BETTER_AUTH_SECRET belum kuat.' }
  if (!parsed.success || token.length < 32 || token.length > 128) {
    return { error: 'Data undangan tidak valid.' }
  }

  const tokenHash = hashInviteToken(token)
  const now = new Date()
  const [invite] = await db.select()
    .from(supervisorInvitations)
    .where(and(
      eq(supervisorInvitations.tokenHash, tokenHash),
      eq(supervisorInvitations.email, parsed.data.email),
      isNull(supervisorInvitations.acceptedAt),
      gt(supervisorInvitations.expiresAt, now),
    ))
    .limit(1)

  if (!invite) return { error: 'Undangan tidak ditemukan, sudah digunakan, atau telah kedaluwarsa.' }
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) return { error: 'Keluar dari akun saat ini untuk menerima undangan.' }

  try {
    const result = await auth.api.signUpEmail({
      headers: await headers(),
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      },
    })

    const [claimedInvite] = await db.update(supervisorInvitations)
      .set({ acceptedAt: new Date() })
      .where(and(
        eq(supervisorInvitations.id, invite.id),
        isNull(supervisorInvitations.acceptedAt),
        gt(supervisorInvitations.expiresAt, new Date()),
      ))
      .returning({ id: supervisorInvitations.id })

    if (!claimedInvite) return { error: 'Undangan sudah digunakan. Minta admin membuat undangan baru.' }

    await db.update(user)
      .set({ role: 'supervisor', workspaceId: invite.userId, emailVerified: true, updatedAt: new Date() })
      .where(eq(user.id, result.user.id))
  } catch {
    return { error: 'Undangan tidak dapat diproses. Pastikan email belum terdaftar.' }
  }

  revalidatePath('/supervisor')
  redirect('/supervisor')
}
