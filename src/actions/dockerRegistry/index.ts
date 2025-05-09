'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { protectedClient } from '@/lib/safe-action'
import { DockerRegistry } from '@/payload-types'

import {
  connectDockerRegistrySchema,
  deleteDockerRegistrySchema,
} from './validator'

export const getDockerRegistries = protectedClient
  .metadata({
    actionName: 'getDockerRegistries',
  })
  .action(async ({ ctx }) => {
    const payload = await getPayload({ config: configPromise })
    const { userTenant } = ctx
    const { docs } = await payload.find({
      collection: 'dockerRegistries',
      pagination: false,
      where: {
        and: [
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

export const connectDockerRegistryAction = protectedClient
  .metadata({
    actionName: 'connectDockerRegistryAction',
  })
  .schema(connectDockerRegistrySchema)
  .action(async ({ clientInput, ctx }) => {
    const { password, username, type, name, id } = clientInput
    const payload = await getPayload({ config: configPromise })

    let response: DockerRegistry

    if (id) {
      response = await payload.update({
        collection: 'dockerRegistries',
        id,
        data: {
          type,
          name,
          username,
          password,
        },
      })
    } else {
      response = await payload.create({
        collection: 'dockerRegistries',
        data: {
          type,
          name,
          username,
          password,
          tenant: ctx.userTenant.tenant,
        },
      })
    }

    return response
  })

export const deleteDockerRegistryAction = protectedClient
  .metadata({
    actionName: 'deleteDockerRegistryAction',
  })
  .schema(deleteDockerRegistrySchema)
  .action(async ({ clientInput }) => {
    const { id } = clientInput
    const payload = await getPayload({ config: configPromise })

    const response = await payload.delete({
      collection: 'dockerRegistries',
      id,
    })

    return response
  })
