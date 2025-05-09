'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { protectedClient } from '@/lib/safe-action'

import { getServiceDetailsSchema } from './validator'

export const getServiceDetails = protectedClient
  .metadata({
    actionName: 'getServiceDetails',
  })
  .schema(getServiceDetailsSchema)
  .action(async ({ clientInput }) => {
    const { id } = clientInput
    const payload = await getPayload({ config: configPromise })

    const service = await payload.findByID({
      collection: 'services',
      id,
    })

    return service
  })

export const getServiceDeploymentsBackups = protectedClient
  .metadata({
    actionName: 'getServiceDeploymentsBackups',
  })
  .schema(getServiceDetailsSchema)
  .action(async ({ clientInput }) => {
    const { id } = clientInput
    const payload = await getPayload({ config: configPromise })

    const [service, { docs: deployments }, { docs: backupsDocs }] =
      await Promise.all([
        payload.findByID({
          collection: 'services',
          id,
        }),
        payload.find({
          collection: 'deployments',
          where: {
            service: {
              equals: id,
            },
          },
        }),
        payload.find({
          collection: 'backups',
          where: {
            service: {
              equals: id,
            },
          },
        }),
      ])

    return { service, deployments, backupsDocs }
  })
