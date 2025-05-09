'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { protectedClient } from '@/lib/safe-action'

import { getProjectDetailsSchema } from './validator'

export const getProjectDetails = protectedClient
  .metadata({
    actionName: 'getProjectDetails',
  })
  .schema(getProjectDetailsSchema)
  .action(async ({ clientInput }) => {
    const { id } = clientInput
    const payload = await getPayload({ config: configPromise })

    const [{ docs: services }, project] = await Promise.all([
      payload.find({
        collection: 'services',
        where: {
          project: {
            equals: id,
          },
        },
        joins: {
          deployments: {
            limit: 1,
          },
        },
        depth: 10,
      }),
      payload.findByID({
        collection: 'projects',
        id,
        select: {
          name: true,
          description: true,
          server: true,
        },
      }),
    ])

    return {
      services,
      project,
    }
  })

export const getProjectBreadcrumbs = protectedClient
  .metadata({
    actionName: 'getProjectBreadcrumbs',
  })
  .schema(getProjectDetailsSchema)
  .action(async ({ clientInput }) => {
    const { id } = clientInput
    const payload = await getPayload({ config: configPromise })

    const [project, projects] = await Promise.all([
      payload.findByID({
        collection: 'projects',
        id,
        depth: 10,
        select: {
          server: true,
          name: true,
        },
      }),
      payload.find({
        collection: 'projects',
        pagination: false,
        select: {
          name: true,
        },
      }),
    ])

    return { project, projects }
  })
