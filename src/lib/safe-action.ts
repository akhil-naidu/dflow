import configPromise from '@payload-config'
import { createSafeActionClient } from 'next-safe-action'
import { getPayload } from 'payload'
import { z } from 'zod'

import { getTenant } from './get-tenant'

export const publicClient = createSafeActionClient({
  defineMetadataSchema() {
    return z.object({
      actionName: z.string({ message: 'actionName is required!' }),
    })
  },
  // Can also be an async function.
  handleServerError(error) {
    // Log to console.
    console.error('Action error:', error.message)
    // Returning the error message instead of throwing it
    return error.message
  },
})

const payload = await getPayload({
  config: configPromise,
})

export const protectedClient = publicClient.use(async ({ next, ctx }) => {
  const { user, userTenant, isInTenant } = await getTenant() // Assuming getTenant() returns tenant data
  if (!user) {
    throw new Error('User not authenticated')
  }
  if (!isInTenant) {
    throw new Error('User is not part of the specified tenant')
  }

  return next({
    ctx: {
      ...ctx,
      user,
      userTenant,
    },
  })
})
