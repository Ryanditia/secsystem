import 'server-only'

import { createNeonAuth } from '@neondatabase/auth/next/server'
import { isNeonAuthConfigured } from '@/lib/auth-config'

const baseUrl = process.env.NEON_AUTH_BASE_URL
const cookieSecret = process.env.BETTER_AUTH_SECRET

if (!baseUrl || !cookieSecret || !isNeonAuthConfigured()) {
  throw new Error('Neon Auth requires NEON_AUTH_BASE_URL and a strong existing cookie secret.')
}

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    sameSite: process.env.NODE_ENV === 'development' ? 'none' : 'lax',
  },
})
