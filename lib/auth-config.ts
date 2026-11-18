import 'server-only'

export function isStrongSecret(value: string | undefined) {
  return Boolean(value && value.length >= 32 && new Set(value).size >= 16)
}

export function isAuthSecretStrong() {
  return isStrongSecret(process.env.BETTER_AUTH_SECRET)
}

export function isNeonAuthConfigured() {
  return Boolean(process.env.NEON_AUTH_BASE_URL && isAuthSecretStrong())
}
