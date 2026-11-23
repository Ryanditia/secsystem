import { count, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getAppUser } from '@/lib/authz'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const current = await getAppUser()
  if (current) redirect(current.role === 'admin' ? '/admin' : '/supervisor')

  const [{ data: session }, [adminCount]] = await Promise.all([
    auth.getSession(),
    db.select({ value: count() }).from(user).where(eq(user.role, 'admin')),
  ])

  if (adminCount.value === 0 && !session?.user) redirect('/setup')
  if (adminCount.value === 0 && session?.user?.emailVerified && session.user.email.toLowerCase() === process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase()) redirect('/setup')
  redirect('/sign-in')
}
