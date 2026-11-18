import 'server-only'

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export function createInviteToken() {
  return randomBytes(32).toString('base64url')
}

export function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function isValidBootstrapToken(input: string, expected: string) {
  const actualBuffer = Buffer.from(input.trim())
  const expectedBuffer = Buffer.from(expected.trim())
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}
