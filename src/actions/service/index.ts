'use server'

import configPromise from '@payload-config'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'

import { protectedClient, publicClient } from '@/lib/safe-action'
import { server } from '@/lib/server'
import { dynamicSSH } from '@/lib/ssh'
import { addExposeDatabasePortQueue } from '@/queues/database/expose'
import { addRestartDatabaseQueue } from '@/queues/database/restart'
import { addStopDatabaseQueue } from '@/queues/database/stop'

import {
  createServiceSchema,
  deleteServiceSchema,
  exposeDatabasePortSchema,
  updateServiceSchema,
} from './validator'

const payload = await getPayload({ config: configPromise })

// No need to handle try/catch that abstraction is taken care by next-safe-actions
export const createServiceAction = publicClient
  .metadata({
    // This action name can be used for sentry tracking
    actionName: 'createServiceAction',
  })
  .schema(createServiceSchema)
  .action(async ({ clientInput }) => {
    const { name, description, projectId, type, databaseType } = clientInput

    const response = await payload.create({
      collection: 'services',
      data: {
        project: projectId,
        name,
        description,
        type,
        databaseDetails: {
          type: databaseType,
        },
      },
    })

    if (response) {
      revalidatePath(`/dashboard/project/${projectId}`)
    }

    return response
  })

export const deleteServiceAction = publicClient
  .metadata({
    // This action name can be used for sentry tracking
    actionName: 'deleteServiceAction',
  })
  .schema(deleteServiceSchema)
  .action(async ({ clientInput }) => {
    const { id } = clientInput

    const response = await payload.delete({
      collection: 'services',
      id,
    })

    if (response) {
      const projectId =
        typeof response.project === 'object'
          ? response.project.id
          : response.project

      // Revalidate the parent project page and the service page
      revalidatePath(`/dashboard/project/${projectId}/service/${id}`)
      revalidatePath(`/dashboard/project/${projectId}`)
      return { deleted: true }
    }
  })

export const updateServiceAction = protectedClient
  .metadata({
    actionName: 'updateServerAction',
  })
  .schema(updateServiceSchema)
  .action(async ({ clientInput, ctx }) => {
    const { id, ...data } = clientInput

    const filteredObject = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined),
    )

    const response = await payload.update({
      collection: 'services',
      data: filteredObject,
      id,
    })

    const projectId =
      typeof response?.project === 'object' ? response.project.id : ''

    if (projectId) {
      revalidatePath(`/dashboard/project/${projectId}/service/${id}/general`)
    }

    return response
  })

export const restartDatabaseAction = protectedClient
  .metadata({
    actionName: 'restartDatabaseAction',
  })
  .schema(deleteServiceSchema)
  .action(async ({ clientInput, ctx }) => {
    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')

    const { id } = clientInput
    const {
      project,
      type,
      providerType,
      githubSettings,
      provider,
      ...serviceDetails
    } = await payload.findByID({
      collection: 'services',
      depth: 10,
      id,
    })

    // A if check for getting all ssh keys & server details
    if (
      typeof project === 'object' &&
      typeof project?.server === 'object' &&
      typeof project?.server?.sshKey === 'object'
    ) {
      const sshDetails = {
        privateKey: project?.server?.sshKey?.privateKey,
        host: project?.server?.ip,
        username: project?.server?.username,
        port: project?.server?.port,
      }

      if (type === 'database' && serviceDetails.databaseDetails?.type) {
        const queueResponse = await addRestartDatabaseQueue({
          databaseName: serviceDetails.name,
          databaseType: serviceDetails.databaseDetails?.type,
          sshDetails,
          payloadToken: payloadToken?.value,
          serviceDetails: {
            id: serviceDetails.id,
          },
        })

        if (queueResponse.id) {
          return { success: true }
        }
      }
    }
  })

export const stopDatabaseAction = protectedClient
  .metadata({
    actionName: 'stopDatabaseAction',
  })
  .schema(deleteServiceSchema)
  .action(async ({ clientInput, ctx }) => {
    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')

    const { id } = clientInput
    const {
      project,
      type,
      providerType,
      githubSettings,
      provider,
      ...serviceDetails
    } = await payload.findByID({
      collection: 'services',
      depth: 10,
      id,
    })

    // A if check for getting all ssh keys & server details
    if (
      typeof project === 'object' &&
      typeof project?.server === 'object' &&
      typeof project?.server?.sshKey === 'object'
    ) {
      const sshDetails = {
        privateKey: project?.server?.sshKey?.privateKey,
        host: project?.server?.ip,
        username: project?.server?.username,
        port: project?.server?.port,
      }

      if (type === 'database' && serviceDetails.databaseDetails?.type) {
        const queueResponse = await addStopDatabaseQueue({
          databaseName: serviceDetails.name,
          databaseType: serviceDetails.databaseDetails?.type,
          sshDetails,
          payloadToken: payloadToken?.value,
          serviceDetails: {
            id: serviceDetails.id,
          },
        })

        if (queueResponse.id) {
          return { success: true }
        }
      }
    }
  })

export const exposeDatabasePortAction = protectedClient
  .metadata({
    actionName: 'exposeDatabasePortAction',
  })
  .schema(exposeDatabasePortSchema)
  .action(async ({ clientInput }) => {
    const { id, ports } = clientInput

    const {
      project,
      type,
      providerType,
      githubSettings,
      provider,
      ...serviceDetails
    } = await payload.findByID({
      collection: 'services',
      depth: 10,
      id,
    })

    // A if check for getting all ssh keys & server details
    if (
      typeof project === 'object' &&
      typeof project?.server === 'object' &&
      typeof project?.server?.sshKey === 'object'
    ) {
      const sshDetails = {
        privateKey: project?.server?.sshKey?.privateKey,
        host: project?.server?.ip,
        username: project?.server?.username,
        port: project?.server?.port,
      }

      if (type === 'database' && serviceDetails.databaseDetails?.type) {
        const ssh = await dynamicSSH(sshDetails)

        console.log("I'm inside", { ssh })

        const portsResponse = await server.ports.available({
          ssh,
          ports,
        })

        // If port response failed throw exception
        if (!portsResponse) {
          throw new Error('port-status unavailable, please try again!')
        }

        const unavailablePorts = portsResponse.filter(
          ({ available }) => !available,
        )

        // If any port is in use throwing an error
        if (unavailablePorts.length) {
          throw new Error(
            `${unavailablePorts.map(({ port }) => port).join(', ')} are already in use!`,
          )
        }

        // Updating the exposed ports in payload
        await payload.update({
          collection: 'services',
          data: {
            databaseDetails: {
              exposedPorts: ports,
            },
          },
          id,
        })

        const queueResponse = await addExposeDatabasePortQueue({
          databaseName: serviceDetails.name,
          databaseType: serviceDetails.databaseDetails?.type,
          sshDetails,

          serviceDetails: {
            id,
            ports,
            previousPorts: serviceDetails.databaseDetails?.exposedPorts ?? [],
          },
        })

        ssh.dispose()

        if (queueResponse.id) {
          return { success: true }
        }
      }
    }
  })
