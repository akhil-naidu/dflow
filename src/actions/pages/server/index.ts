'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { protectedClient } from '@/lib/safe-action'
import { ServerType } from '@/payload-types-overrides'

import { getServerDetailsSchema } from './validator'

export const getServersDetails = protectedClient
  .metadata({
    actionName: 'getServersDetails',
  })
  .action(async () => {
    const payload = await getPayload({ config: configPromise })

    const { docs: servers } = await payload.find({
      collection: 'servers',
      pagination: false,
      context: { populateServerDetails: true },
    })

    return { servers }
  })

export const getAddServerDetails = protectedClient
  .metadata({
    actionName: 'getAddServerDetails',
  })
  .action(async () => {
    const payload = await getPayload({ config: configPromise })

    const [{ docs: sshKeys }, { docs: securityGroups }] = await Promise.all([
      payload.find({ collection: 'sshKeys', pagination: false }),
      payload.find({ collection: 'securityGroups', pagination: false }),
    ])

    return { sshKeys, securityGroups }
  })

export const getServerBreadcrumbs = protectedClient
  .metadata({
    actionName: 'getServerBreadcrumbs',
  })
  .schema(getServerDetailsSchema)
  .action(async ({ clientInput }) => {
    const { id } = clientInput
    const payload = await getPayload({ config: configPromise })

    const [{ docs: servers }, server] = await Promise.all([
      payload.find({ collection: 'servers', pagination: false }),
      payload.findByID({
        collection: 'servers',
        id,
        context: { populateServerDetails: true },
      }) as Promise<ServerType>,
    ])

    return { server, servers }
  })

export const getServerGeneralTabDetails = protectedClient
  .metadata({
    actionName: 'getServerGeneralTabDetails',
  })
  .schema(getServerDetailsSchema)
  .action(async ({ clientInput }) => {
    const { id } = clientInput
    const payload = await getPayload({ config: configPromise })

    const [{ docs: sshKeys }, { docs: projects }, { docs: securityGroups }] =
      await Promise.all([
        payload.find({ collection: 'sshKeys', pagination: false }),
        payload.find({
          collection: 'projects',
          where: { server: { equals: id } },
        }),
        payload.find({
          collection: 'securityGroups',
          pagination: false,
          where: {
            and: [
              {
                or: [
                  { cloudProvider: { equals: id } },
                  { cloudProvider: { exists: false } },
                ],
              },
              {
                or: [
                  {
                    cloudProviderAccount: {
                      equals: id,
                    },
                  },
                  { cloudProviderAccount: { exists: false } },
                ],
              },
            ],
          },
        }),
      ])

    return { sshKeys, projects, securityGroups }
  })
