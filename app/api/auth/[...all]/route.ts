import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import { isAuthSecretStrong } from '@/lib/auth-config'

const handlers = toNextJsHandler(auth)
export const GET = handlers.GET

export async function POST(request: Request) {
  if (!isAuthSecretStrong()) {
    return Response.json({ message: 'Authentication is not configured securely.' }, { status: 503 })
  }

  const pathname = new URL(request.url).pathname
  if (pathname.endsWith('/sign-up/email')) {
    return Response.json({ message: 'Account creation requires a valid invitation.' }, { status: 403 })
  }

  return handlers.POST(request)
}
