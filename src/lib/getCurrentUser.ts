import configPromise from '@payload-config'
import { env } from 'env'
import { getPayload } from 'payload'

import { User } from '@/payload-types'

export const getCurrentUser = async (headers?: Headers) => {
  if (!headers) {
    // this is a client component

    try {
      const res = await fetch(`${env.NEXT_PUBLIC_WEBSITE_URL}/api/users/me`, {
        credentials: 'include',
      })

      const { user }: { user: User | null } = await res.json()

      return user
    } catch (error) {
      throw new Error('not authenticated')
    }
  } else {
    // has token, so server component
    const payload = await getPayload({
      config: configPromise,
    })
    const { user } = await payload.auth({ headers })

    return user
  }
}
