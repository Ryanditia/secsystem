import { auth } from '@/lib/auth'
import { isAuthSecretStrong } from '@/lib/auth-config'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export type AppUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'supervisor'
  workspaceId: string
}

export async function getAppUser(): Promise<AppUser | null> {
  if (!isAuthSecretStrong()) return null
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null

  const [record] = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role, workspaceId: user.workspaceId })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  if (!record || !record.workspaceId || (record.role !== 'admin' && record.role !== 'supervisor')) return null

  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role,
    workspaceId: record.workspaceId,
  }
}

export async function requireAppUser(role?: AppUser['role']) {
  const current = await getAppUser()
  if (!current) redirect('/sign-in')
  if (role && current.role !== role) redirect(current.role === 'admin' ? '/admin' : '/supervisor')
  return current
}
