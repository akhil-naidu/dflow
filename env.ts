import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

const changeBasedOnENV = (env: any) => {
  if (process.env.NODE_ENV === 'development') {
    return `http://${env}`
  }
  if (process.env.NODE_ENV === 'production') return `https://${env}`

  return `http://${env}`
}

export const env = createEnv({
  server: {
    DATABASE_URI: z.string().min(1),
    REDIS_URL: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string(),
  },
  client: {
    NEXT_PUBLIC_WEBSITE_URL: z.string().url(),
    NEXT_PUBLIC_GITHUB_CLIENT_ID: z.string(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_WEBSITE_URL: changeBasedOnENV(
      process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.RAILWAY_PUBLIC_DOMAIN,
    ),
    DATABASE_URI: process.env.DATABASE_URI,
    REDIS_URL: process.env.REDIS_URL,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    NEXT_PUBLIC_GITHUB_CLIENT_ID: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
  },
})
