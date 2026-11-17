import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

const handlers = toNextJsHandler(auth)
export const GET = handlers.GET

export async function POST(request: Request) {
  const pathname = new URL(request.url).pathname
  if (pathname.endsWith('/sign-up/email')) {
    return Response.json({ message: 'Account creation requires a valid invitation.' }, { status: 403 })
  }

  return handlers.POST(request)
}
