import { count, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { getAppUser } from '@/lib/authz'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [adminCount] = await db.select({ value: count() }).from(user).where(eq(user.role, 'admin'))
  if (adminCount.value === 0) redirect('/setup')

  const current = await getAppUser()
  if (!current) redirect('/sign-in')
  redirect(current.role === 'admin' ? '/admin' : '/supervisor')
}
