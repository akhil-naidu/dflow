'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { protectedClient } from '@/lib/safe-action'

import { cloudProviderAccountsSchema } from './validator'

export const getCloudProvidersAccountsAction = protectedClient
  .metadata({
    actionName: 'getCloudProvidersAccountsAction',
  })
  .schema(cloudProviderAccountsSchema)
  .action(async ({ clientInput, ctx }) => {
    const { type } = clientInput
    const { userTenant } = ctx
    const payload = await getPayload({ config: configPromise })

    const { docs } = await payload.find({
      collection: 'cloudProviderAccounts',
      pagination: false,
      where: {
        and: [
          {
            type: {
              equals: type,
            },
          },
          {
            'tenant.slug': {
              equals: userTenant.tenant?.slug,
            },
          },
        ],
      },
    })

    return docs
  })
