import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

export const getCurrentUser = async () => {
  const headersList = await headers()

  const payload = await getPayload({
    config: configPromise,
  })

  const { user } = await payload.auth({ headers: headersList })

  console.dir({ user, headersList }, { depth: null })

  return user
}
