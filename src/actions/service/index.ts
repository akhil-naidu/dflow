'use server'

import configPromise from '@payload-config'
import { revalidatePath } from 'next/cache'
import { NodeSSH } from 'node-ssh'
import { getPayload } from 'payload'

import { dokku } from '@/lib/dokku'
import { protectedClient, publicClient } from '@/lib/safe-action'
import { server } from '@/lib/server'
import { dynamicSSH } from '@/lib/ssh'
import { addDestroyApplicationQueue } from '@/queues/app/destroy'
import { addRestartAppQueue } from '@/queues/app/restart'
import { addStopAppQueue } from '@/queues/app/stop'
import { addDestroyDatabaseQueue } from '@/queues/database/destroy'
import { addExposeDatabasePortQueue } from '@/queues/database/expose'
import { addRestartDatabaseQueue } from '@/queues/database/restart'
import { addStopDatabaseQueue } from '@/queues/database/stop'
import { addManageServiceDomainQueue } from '@/queues/domain/manage'
import { addUpdateEnvironmentVariablesQueue } from '@/queues/environment/update'
import { addLetsencryptRegenerateQueueQueue } from '@/queues/letsencrypt/regenerate'

import {
  createServiceSchema,
  deleteServiceSchema,
  exposeDatabasePortSchema,
  regenerateSSLSchema,
  updateServiceDomainSchema,
  updateServiceEnvironmentsSchema,
  updateServiceSchema,
} from './validator'

const payload = await getPayload({ config: configPromise })

// No need to handle try/catch that abstraction is taken care by next-safe-actions
export const createServiceAction = protectedClient
  .metadata({
    // This action name can be used for sentry tracking
    actionName: 'createServiceAction',
  })
  .schema(createServiceSchema)
  .action(async ({ clientInput, ctx }) => {
    const { name, description, projectId, type, databaseType } = clientInput
    const {
      userTenant: { tenant },
    } = ctx

    const { server } = await payload.findByID({
      collection: 'projects',
      id: projectId,
      depth: 10,
    })

    if (typeof server === 'object' && typeof server.sshKey === 'object') {
      let ssh: NodeSSH | null = null
      const sshOptions = {
        host: server.ip,
        username: server.username,
        port: server.port,
        privateKey: server.sshKey.privateKey,
      }

      try {
        ssh = await dynamicSSH(sshOptions)

        if (type === 'app' || type === 'docker') {
          // Creating app in dokku
          const appsCreationResponse = await dokku.apps.create(ssh, name)

          // If app created adding db entry
          if (appsCreationResponse) {
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
                tenant,
              },
            })

            if (response?.id) {
              revalidatePath(`/${tenant.slug}/dashboard/project/${projectId}`)
              return {
                success: true,
                redirectUrl: `/${tenant.slug}/dashboard/project/${projectId}/service/${response.id}`,
              }
            }
          }
        } else if (databaseType) {
          const databaseList = await dokku.database.list(ssh, databaseType)

          // Throwing a error if database is already created
          if (databaseList.includes(name)) {
            throw new Error('Name is already taken!')
          }

          const databaseResponse = await payload.create({
            collection: 'services',
            data: {
              project: projectId,
              name,
              description,
              type,
              databaseDetails: {
                type: databaseType,
              },
              tenant,
            },
          })

          if (databaseResponse.id) {
            revalidatePath(`/${tenant.slug}/dashboard/project/${projectId}`)

            return {
              success: true,
              redirectUrl: `/${tenant.slug}/dashboard/project/${projectId}/service/${databaseResponse.id}`,
            }
          }
        }
      } catch (error) {
        let message = ''

        if (error instanceof Error) {
          message = error.message
        }

        throw new Error(message)
      } finally {
        // disposing ssh even on error cases
        if (ssh) {
          ssh.dispose()
        }
      }
    }
  })

export const deleteServiceAction = publicClient
  .metadata({
    // This action name can be used for sentry tracking
    actionName: 'deleteServiceAction',
  })
  .schema(deleteServiceSchema)
  .action(async ({ clientInput }) => {
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
      id,
      depth: 10,
    })

    if (typeof project === 'object') {
      const serverId =
        typeof project.server === 'object' ? project.server.id : project.server

      // Again fetching the server details because, it's coming as objectID
      const serverDetails = await payload.findByID({
        collection: 'servers',
        id: serverId,
      })

      if (serverDetails.id && typeof serverDetails.sshKey === 'object') {
        const sshDetails = {
          privateKey: serverDetails.sshKey?.privateKey,
          host: serverDetails?.ip,
          username: serverDetails?.username,
          port: serverDetails?.port,
        }

        // handling database delete
        if (type === 'database' && serviceDetails.databaseDetails?.type) {
          const databaseDeletionQueueResponse = await addDestroyDatabaseQueue({
            databaseName: serviceDetails.name,
            databaseType: serviceDetails.databaseDetails?.type,
            sshDetails,
            serverDetails: {
              id: serverDetails.id,
            },
          })

          console.log({ databaseDeletionQueueResponse })
        }

        // handling service delete
        if (type === 'app' || type === 'docker') {
          const appDeletionQueueResponse = await addDestroyApplicationQueue({
            sshDetails,
            serviceDetails: {
              name: serviceDetails.name,
            },
            serverDetails: {
              id: serverDetails.id,
            },
          })

          console.log({ appDeletionQueueResponse })
        }

        const response = await payload.delete({
          collection: 'services',
          id,
        })

        const deletedDeploymentsResponse = await payload.delete({
          collection: 'deployments',
          where: {
            service: {
              equals: id,
            },
          },
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
      } else {
        console.log('Server details not found!', serverId)
      }
    }
  })

export const updateServiceAction = protectedClient
  .metadata({
    actionName: 'updateServerAction',
  })
  .schema(updateServiceSchema)
  .action(async ({ clientInput, ctx }) => {
    const { id, ...data } = clientInput

    const previousDetails = await payload.findByID({
      collection: 'services',
      id,
    })

    const response = await payload.update({
      collection: 'services',
      data: {
        ...data,
        provider: data?.provider ?? null,
      },
      id,
      depth: 10,
    })

    const environmentVariablesChange =
      data?.variables &&
      JSON.stringify(previousDetails.variables) !==
        JSON.stringify(data?.variables)

    // If env variables are added then adding it to queue to update env
    if (
      environmentVariablesChange &&
      typeof response?.project === 'object' &&
      typeof response?.project?.server === 'object' &&
      typeof response?.project?.server?.sshKey === 'object'
    ) {
      await addUpdateEnvironmentVariablesQueue({
        serviceDetails: {
          previousVariables: previousDetails?.variables ?? [],
          variables: response?.variables ?? [],
          name: response?.name,
          noRestart: data?.noRestart ?? true,
          id,
        },
        sshDetails: {
          host: response?.project?.server?.ip,
          port: response?.project?.server?.port,
          username: response?.project?.server?.username,
          privateKey: response?.project?.server?.sshKey?.privateKey,
        },
        serverDetails: {
          id: response.project.server.id,
        },
      })
    }

    if (response?.id) {
      const projectId =
        typeof response?.project === 'object'
          ? response?.project?.id
          : response?.project
      revalidatePath(`/dashboard/project/${projectId}/service/${response?.id}`)
      return { success: true }
    }
  })

export const restartServiceAction = protectedClient
  .metadata({
    actionName: 'restartServiceAction',
  })
  .schema(deleteServiceSchema)
  .action(async ({ clientInput, ctx }) => {
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

      let queueId: string | undefined

      if (type === 'database' && serviceDetails.databaseDetails?.type) {
        const queueResponse = await addRestartDatabaseQueue({
          databaseName: serviceDetails.name,
          databaseType: serviceDetails.databaseDetails?.type,
          sshDetails,
          serviceDetails: {
            id: serviceDetails.id,
          },
          serverDetails: {
            id: serviceDetails.id,
          },
        })

        queueId = queueResponse.id
      }

      if (type === 'docker' || type === 'app') {
        const queueResponse = await addRestartAppQueue({
          sshDetails,
          serviceDetails: {
            id: serviceDetails.id,
            name: serviceDetails.name,
          },
          serverDetails: {
            id: serviceDetails.id,
          },
        })

        queueId = queueResponse.id
      }

      if (queueId) {
        return { success: true }
      }
    }
  })

export const stopServerAction = protectedClient
  .metadata({
    actionName: 'stopServerAction',
  })
  .schema(deleteServiceSchema)
  .action(async ({ clientInput, ctx }) => {
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

      let queueId: string | undefined

      if (type === 'database' && serviceDetails.databaseDetails?.type) {
        const queueResponse = await addStopDatabaseQueue({
          databaseName: serviceDetails.name,
          databaseType: serviceDetails.databaseDetails?.type,
          sshDetails,
          serviceDetails: {
            id: serviceDetails.id,
          },
          serverDetails: {
            id: project.server.id,
          },
        })

        queueId = queueResponse.id
      }

      if (type === 'docker' || type === 'app') {
        const queueResponse = await addStopAppQueue({
          sshDetails,
          serviceDetails: {
            id: serviceDetails.id,
            name: serviceDetails.name,
          },
          serverDetails: {
            id: project.server.id,
          },
        })

        queueId = queueResponse.id
      }

      if (queueId) {
        return { success: true }
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
        let ssh: NodeSSH | null = null

        try {
          ssh = await dynamicSSH(sshDetails)

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
              ports,
              previousPorts: serviceDetails.databaseDetails?.exposedPorts ?? [],
            },

            serverDetails: {
              id: project.server.id,
            },
          })

          if (queueResponse.id) {
            return { success: true }
          }
        } catch (error) {
          let message = error instanceof Error ? error.message : ''
          throw new Error(message)
        } finally {
          ssh?.dispose()
        }
      }
    }
  })

export const updateServiceEnvironmentVariablesAction = protectedClient
  .metadata({
    actionName: 'updateServiceEnvironmentVariablesAction',
  })
  .schema(updateServiceEnvironmentsSchema)
  .action(async ({ clientInput }) => {
    const { id, environmentVariables, projectId } = clientInput

    const updatedService = await payload.update({
      collection: 'services',
      id,
      data: {
        environmentVariables,
      },
    })

    if (updatedService.id) {
      revalidatePath(`/dashboard/project/${projectId}/service/${id}`)
      return { success: true }
    }
  })

export const updateServiceDomainAction = protectedClient
  .metadata({
    actionName: 'updateServiceDomainAction',
  })
  .schema(updateServiceDomainSchema)
  .action(async ({ clientInput }) => {
    const { id, domain, operation } = clientInput

    // Fetching service-details for showing previous details
    const { domains: servicePreviousDomains } = await payload.findByID({
      id,
      collection: 'services',
    })

    let updatedDomains = servicePreviousDomains ?? []

    if (operation === 'remove') {
      // In remove case removing that particular domain
      updatedDomains = updatedDomains.filter(
        domainDetails => domainDetails.domain !== domain.hostname,
      )
    } else if (operation === 'set') {
      updatedDomains = [
        {
          domain: domain.hostname,
          default: true,
          autoRegenerateSSL: domain.autoRegenerateSSL,
          certificateType: domain.certificateType,
        },
      ]
    } else {
      // in add case directly adding domain
      updatedDomains = [
        ...updatedDomains,
        {
          domain: domain.hostname,
          default: false,
          autoRegenerateSSL: domain.autoRegenerateSSL,
          certificateType: domain.certificateType,
        },
      ]
    }

    const updatedServiceDomainResponse = await payload.update({
      id,
      data: {
        domains: updatedDomains,
      },
      collection: 'services',
      depth: 10,
    })

    if (
      typeof updatedServiceDomainResponse.project === 'object' &&
      typeof updatedServiceDomainResponse.project.server === 'object' &&
      typeof updatedServiceDomainResponse.project.server.sshKey === 'object'
    ) {
      const { ip, port, username, id } =
        updatedServiceDomainResponse.project.server
      const privateKey =
        updatedServiceDomainResponse.project.server.sshKey.privateKey

      const queueResponse = await addManageServiceDomainQueue({
        serviceDetails: {
          action: operation,
          domain: domain.hostname,
          name: updatedServiceDomainResponse.name,
          certificateType: domain.certificateType,
          autoRegenerateSSL: domain.autoRegenerateSSL,
        },
        sshDetails: {
          privateKey,
          host: ip,
          port,
          username,
        },
        serverDetails: {
          id,
        },
      })

      if (queueResponse.id) {
        revalidatePath(
          `/dashboard/project/${updatedServiceDomainResponse.project.id}/service/${id}`,
        )
        return { success: true }
      }
    }
  })

export const regenerateSSLAction = protectedClient
  .metadata({
    actionName: 'regenerateSSLAction',
  })
  .schema(regenerateSSLSchema)
  .action(async ({ clientInput }) => {
    const { id, email } = clientInput

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

      const response = await addLetsencryptRegenerateQueueQueue({
        sshDetails,
        serverDetails: { id: project?.server?.id },
        serviceDetails: {
          name: serviceDetails.name,
          email,
        },
      })

      if (response.id) {
        return { success: true }
      }
    }
  })
