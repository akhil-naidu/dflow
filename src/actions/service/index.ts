'use server'

import { revalidatePath } from 'next/cache'
import { NodeSSH } from 'node-ssh'

import { dokku } from '@/lib/dokku'
import { protectedClient } from '@/lib/safe-action'
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
  restartServiceSchema,
  stopServiceSchema,
  updateServiceDomainSchema,
  updateServiceSchema,
} from './validator'

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
      payload,
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

export const deleteServiceAction = protectedClient
  .metadata({
    // This action name can be used for sentry tracking
    actionName: 'deleteServiceAction',
  })
  .schema(deleteServiceSchema)
  .action(async ({ clientInput, ctx }) => {
    const { id, deleteBackups, deleteFromServer } = clientInput
    const {
      userTenant: { tenant },
      payload,
    } = ctx

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

      // Only delete from server if the option is enabled
      if (
        deleteFromServer &&
        serverDetails.id &&
        typeof serverDetails.sshKey === 'object'
      ) {
        const sshDetails = {
          privateKey: serverDetails.sshKey?.privateKey,
          host: serverDetails?.ip,
          username: serverDetails?.username,
          port: serverDetails?.port,
          hostname: serverDetails?.hostname || undefined,
        }

        let queueId: string | undefined = ''

        // handling database delete
        if (type === 'database' && serviceDetails.databaseDetails?.type) {
          const databaseDeletionQueueResponse = await addDestroyDatabaseQueue({
            databaseName: serviceDetails.name,
            databaseType: serviceDetails.databaseDetails?.type,
            sshDetails,
            serverDetails: {
              id: serverDetails.id,
            },
            serviceId: serviceDetails.id,
            deleteBackups,
            tenant: {
              slug: tenant.slug,
            },
          })

          queueId = databaseDeletionQueueResponse.id
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

          queueId = appDeletionQueueResponse.id
          console.log({ appDeletionQueueResponse })
        }

        // If deleting of service is added to queue, update the service entry
        if (queueId) {
          await payload.update({
            collection: 'services',
            id,
            data: {
              deletedAt: new Date().toISOString(),
            },
          })
        }
      } else if (!deleteFromServer) {
        // If not deleting from server, just mark as deleted in database
        await payload.update({
          collection: 'services',
          id,
          data: {
            deletedAt: new Date().toISOString(),
          },
        })
      }

      // Always update the service in the database (if not already done above)
      const response = await payload.findByID({
        collection: 'services',
        id,
      })

      // Only update if not already marked as deleted
      if (!response.deletedAt) {
        await payload.update({
          collection: 'services',
          id,
          data: {
            deletedAt: new Date().toISOString(),
          },
        })
      }

      // Always delete associated deployments
      const deletedDeploymentsResponse = await payload.update({
        collection: 'deployments',
        data: {
          deletedAt: new Date().toISOString(),
        },
        where: {
          service: {
            equals: id,
          },
        },
      })

      const projectId = typeof project === 'object' ? project.id : project

      // Revalidate the parent project page and the service page
      revalidatePath(
        `/${tenant.slug}/dashboard/project/${projectId}/service/${id}`,
      )
      revalidatePath(`/${tenant.slug}/dashboard/project/${projectId}`)

      return {
        deleted: true,
        deletedFromServer: deleteFromServer,
      }
    } else {
      console.log('Project not found for service:', id)
      throw new Error('Failed to delete service: Project not found')
    }
  })

export const updateServiceAction = protectedClient
  .metadata({
    actionName: 'updateServerAction',
  })
  .schema(updateServiceSchema)
  .action(async ({ clientInput, ctx }) => {
    const { id, ...data } = clientInput
    const {
      userTenant: { tenant },
      payload,
    } = ctx

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
        tenantDetails: {
          slug: tenant.slug,
        },
      })
    }

    if (response?.id) {
      const projectId =
        typeof response?.project === 'object'
          ? response?.project?.id
          : response?.project
      revalidatePath(
        `/${tenant.slug}/dashboard/project/${projectId}/service/${response?.id}`,
      )
      return { success: true }
    }
  })

export const restartServiceAction = protectedClient
  .metadata({
    actionName: 'restartServiceAction',
  })
  .schema(restartServiceSchema)
  .action(async ({ clientInput, ctx }) => {
    const { id } = clientInput
    const { payload, userTenant } = ctx

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
        hostname: project?.server?.hostname || undefined,
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
          tenant: {
            slug: userTenant.tenant.slug,
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

export const stopServerAction = protectedClient
  .metadata({
    actionName: 'stopServerAction',
  })
  .schema(stopServiceSchema)
  .action(async ({ clientInput, ctx }) => {
    const { id } = clientInput
    const { payload, userTenant } = ctx

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
        hostname: project?.server?.hostname || undefined,
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
          tenant: {
            slug: userTenant.tenant.slug,
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
  .action(async ({ clientInput, ctx }) => {
    const { id, action } = clientInput
    const { payload, userTenant } = ctx

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
        hostname: project?.server?.hostname || undefined,
      }

      if (type === 'database' && serviceDetails.databaseDetails?.type) {
        const { exposedPorts } = serviceDetails?.databaseDetails

        try {
          const queueResponse = await addExposeDatabasePortQueue({
            databaseName: serviceDetails.name,
            databaseType: serviceDetails.databaseDetails?.type,
            sshDetails,
            serviceDetails: {
              previousPorts: exposedPorts ?? [],
              id: serviceDetails.id,
              action,
            },
            serverDetails: {
              id: project.server.id,
            },
            tenant: {
              slug: userTenant.tenant.slug,
            },
          })

          if (queueResponse.id) {
            return { success: true }
          }
        } catch (error) {
          let message = error instanceof Error ? error.message : ''
          throw new Error(message)
        }
      }
    }
  })

export const updateServiceDomainAction = protectedClient
  .metadata({
    actionName: 'updateServiceDomainAction',
  })
  .schema(updateServiceDomainSchema)
  .action(async ({ clientInput, ctx }) => {
    const { id, domain, operation } = clientInput
    const {
      userTenant: { tenant },
      payload,
    } = ctx

    // Fetching service-details for showing previous details
    const { domains: servicePreviousDomains, project } = await payload.findByID(
      {
        id,
        collection: 'services',
      },
    )

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
          synced: false,
        },
      ]
    } else {
      // in ADD case directly adding domain
      updatedDomains = [
        ...updatedDomains.map(updatedDomain =>
          domain?.default
            ? { ...updatedDomain, default: false }
            : updatedDomain,
        ),
        {
          domain: domain.hostname,
          default: domain.default ?? false,
          autoRegenerateSSL: domain.autoRegenerateSSL,
          certificateType: domain.certificateType,
          synced: false,
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

    // for add operation we're not syncing domain as domain verification process not done!
    if (operation !== 'add') {
      if (
        typeof updatedServiceDomainResponse.project === 'object' &&
        typeof updatedServiceDomainResponse.project.server === 'object' &&
        typeof updatedServiceDomainResponse.project.server.sshKey === 'object'
      ) {
        const {
          ip,
          port,
          username,
          id: serverId,
        } = updatedServiceDomainResponse.project.server
        const privateKey =
          updatedServiceDomainResponse.project.server.sshKey.privateKey

        await addManageServiceDomainQueue({
          serviceDetails: {
            action: operation,
            domain: domain.hostname,
            name: updatedServiceDomainResponse.name,
            certificateType: domain.certificateType,
            autoRegenerateSSL: domain.autoRegenerateSSL,
            id,
            variables: updatedServiceDomainResponse.variables ?? [],
          },
          sshDetails: {
            privateKey,
            host: ip,
            port,
            username,
          },
          serverDetails: {
            id: serverId,
          },
          tenantDetails: {
            slug: tenant.slug,
          },
          updateEnvironmentVariables: domain.default,
        })
      }
    }

    revalidatePath(
      `/${tenant.slug}/dashboard/project/${typeof project === 'object' ? project.id : project}/service/${id}`,
    )

    return { success: true }
  })

export const regenerateSSLAction = protectedClient
  .metadata({
    actionName: 'regenerateSSLAction',
  })
  .schema(regenerateSSLSchema)
  .action(async ({ clientInput, ctx }) => {
    const { id, email } = clientInput
    const { payload } = ctx

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
        hostname: project?.server?.hostname || undefined,
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

export const syncServiceDomainAction = protectedClient
  .metadata({
    actionName: 'syncServiceDomainAction',
  })
  .schema(updateServiceDomainSchema)
  .action(async ({ clientInput, ctx }) => {
    const { id, domain, operation } = clientInput
    const { payload, userTenant } = ctx

    const { project, variables, ...serviceDetails } = await payload.findByID({
      id,
      collection: 'services',
      depth: 10,
    })

    if (
      typeof project === 'object' &&
      typeof project.server === 'object' &&
      typeof project.server.sshKey === 'object'
    ) {
      const { ip, port, username, id: serverId } = project.server
      const privateKey = project.server.sshKey.privateKey

      const queueResponse = await addManageServiceDomainQueue({
        serviceDetails: {
          action: operation,
          domain: domain.hostname,
          name: serviceDetails.name,
          certificateType: domain.certificateType,
          autoRegenerateSSL: domain.autoRegenerateSSL,
          id,
          variables,
        },
        sshDetails: {
          privateKey,
          host: ip,
          port,
          username,
        },
        serverDetails: {
          id: serverId,
        },
        updateEnvironmentVariables: domain.default,
        tenantDetails: {
          slug: userTenant.tenant.slug,
        },
      })

      if (queueResponse.id) {
        return { success: true }
      }
    }
  })
