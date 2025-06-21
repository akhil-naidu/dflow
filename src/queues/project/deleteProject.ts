import { addDestroyApplicationQueue } from '../app/destroy'
import { addDestroyDatabaseQueue } from '../database/destroy'
import configPromise from '@payload-config'
import { Job } from 'bullmq'
import { getPayload } from 'payload'

import { getQueue, getWorker } from '@/lib/bullmq'
import { jobOptions, pub, queueConnection } from '@/lib/redis'
import { sendActionEvent, sendEvent } from '@/lib/sendEvent'

interface QueueArgs {
  serverDetails: {
    id: string
  }
  projectDetails: {
    id: string
  }
  tenant: {
    slug: string
  }
  deleteBackups: boolean
  deleteFromServer: boolean
}

export const addDeleteProjectQueue = async (data: QueueArgs) => {
  const QUEUE_NAME = `project-${data.projectDetails.id}-delete`

  const deleteProjectQueue = getQueue({
    name: QUEUE_NAME,
    connection: queueConnection,
  })

  const worker = getWorker<QueueArgs>({
    name: QUEUE_NAME,
    processor: async job => {
      const {
        serverDetails,
        projectDetails,
        tenant,
        deleteBackups,
        deleteFromServer,
      } = job.data

      console.log('inside delete project queue')

      try {
        const payload = await getPayload({ config: configPromise })

        sendEvent({
          pub,
          message: 'Starting project deletion process...',
          serverId: serverDetails.id,
        })

        // Fetching all services of project
        const { server, services } = await payload.findByID({
          collection: 'projects',
          id: projectDetails.id,
          depth: 10,
          joins: {
            services: {
              limit: 1000,
            },
          },
        })

        const servicesList = services?.docs?.filter(
          service => typeof service === 'object',
        )

        sendEvent({
          pub,
          message: `Found ${servicesList?.length || 0} service(s) to process...`,
          serverId: serverDetails.id,
        })

        // Only delete from server if the option is enabled
        if (
          deleteFromServer &&
          servicesList &&
          typeof server === 'object' &&
          typeof server.sshKey === 'object'
        ) {
          const sshDetails = {
            privateKey: server.sshKey?.privateKey,
            host: server?.ip,
            username: server?.username,
            port: server?.port,
            hostname: server?.hostname || undefined,
          }

          sendEvent({
            pub,
            message: 'Deleting services from server...',
            serverId: serverDetails.id,
          })

          // iterating in loop and adding deleting of services to queue
          for await (const service of servicesList) {
            let queueId: string | undefined = ''

            // adding deleting of app to queue
            if (service.type === 'app' || service.type === 'docker') {
              sendEvent({
                pub,
                message: `Queuing ${service.type} service '${service.name}' for deletion...`,
                serverId: serverDetails.id,
              })

              const appQueueResponse = await addDestroyApplicationQueue({
                sshDetails,
                serviceDetails: {
                  name: service.name,
                },
                serverDetails: {
                  id: server.id,
                },
              })

              queueId = appQueueResponse.id
            }

            // adding deleting of database to queue
            if (service.type === 'database' && service.databaseDetails?.type) {
              sendEvent({
                pub,
                message: `Queuing database service '${service.name}' for deletion...`,
                serverId: serverDetails.id,
              })

              const databaseQueueResponse = await addDestroyDatabaseQueue({
                databaseName: service.name,
                databaseType: service.databaseDetails?.type,
                sshDetails,
                serverDetails: {
                  id: server.id,
                },
                serviceId: service.id,
                deleteBackups,
                tenant: {
                  slug: tenant.slug,
                },
              })

              queueId = databaseQueueResponse.id
            }

            // If deleting of service is added to queue, update the service entry
            if (queueId) {
              await payload.update({
                collection: 'services',
                id: service.id,
                data: {
                  deletedAt: new Date().toISOString(),
                },
              })

              sendEvent({
                pub,
                message: `✅ Service '${service.name}' marked for deletion`,
                serverId: serverDetails.id,
              })
            }
          }
        } else if (!deleteFromServer && servicesList) {
          sendEvent({
            pub,
            message:
              'Marking services as deleted (not deleting from server)...',
            serverId: serverDetails.id,
          })

          for await (const service of servicesList) {
            await payload.update({
              collection: 'services',
              id: service.id,
              data: {
                deletedAt: new Date().toISOString(),
              },
            })

            sendEvent({
              pub,
              message: `✅ Service '${service.name}' marked as deleted`,
              serverId: serverDetails.id,
            })
          }
        }

        // Always delete the project from the database
        sendEvent({
          pub,
          message: 'Marking project as deleted...',
          serverId: serverDetails.id,
        })

        const deleteProjectResponse = await payload.update({
          collection: 'projects',
          id: projectDetails.id,
          data: {
            deletedAt: new Date().toISOString(),
          },
        })

        if (deleteProjectResponse.id) {
          sendEvent({
            pub,
            message: `✅ Project successfully deleted with ${servicesList?.length || 0} service(s)`,
            serverId: serverDetails.id,
          })

          sendEvent({
            pub,
            message: 'Syncing changes...',
            serverId: serverDetails.id,
          })

          sendActionEvent({
            pub,
            action: 'refresh',
            tenantSlug: tenant.slug,
          })
        } else {
          throw new Error('Failed to delete project from database')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : ''
        throw new Error(`❌ Failed to delete project: ${message}`)
      }
    },

    connection: queueConnection,
  })

  worker.on('failed', async (job: Job<QueueArgs> | undefined, err) => {
    if (job?.data) {
      sendEvent({
        pub,
        message: err.message,
        serverId: job.data.serverDetails.id,
      })
    }
  })

  const id = `delete-project:${new Date().getTime()}`

  return await deleteProjectQueue.add(id, data, {
    jobId: id,
    ...jobOptions,
  })
}
