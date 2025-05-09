'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { protectedClient } from '@/lib/safe-action'

export const getProjectsAndServers = protectedClient
  .metadata({
    actionName: 'getProjectsAndServers',
  })
  .action(async () => {
    const payload = await getPayload({ config: configPromise })

    const [serversRes, projectsRes] = await Promise.all([
      payload.find({
        collection: 'servers',
        pagination: false,
        select: {
          name: true,
          connection: true,
        },
      }),
      payload.find({
        collection: 'projects',
        pagination: false,
      }),
    ])

    return { serversRes, projectsRes }
  })
