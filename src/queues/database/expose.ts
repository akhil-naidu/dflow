import { dokku } from '../../lib/dokku'
import { dynamicSSH } from '../../lib/ssh'
import configPromise from '@payload-config'
import { Job } from 'bullmq'
import { NodeSSH } from 'node-ssh'
import { getPayload } from 'payload'
import { z } from 'zod'

import { createServiceSchema } from '@/actions/service/validator'
import { getQueue, getWorker } from '@/lib/bullmq'
import { jobOptions, pub, queueConnection } from '@/lib/redis'
import { sendActionEvent, sendEvent } from '@/lib/sendEvent'
import { server } from '@/lib/server'

export type DatabaseType = Exclude<
  z.infer<typeof createServiceSchema>['databaseType'],
  undefined
>

interface QueueArgs {
  databaseName: string
  databaseType: DatabaseType
  sshDetails: {
    privateKey: string
    host: string
    username: string
    port: number
    hostname?: string
  }
  serviceDetails: {
    previousPorts?: Array<string>
    id: string
    action: 'expose' | 'unexpose'
  }
  serverDetails: {
    id: string
  }
  tenant: {
    slug: string
  }
}

export const addExposeDatabasePortQueue = async (data: QueueArgs) => {
  const QUEUE_NAME = `server-${data.serverDetails.id}-expose-database`

  const exposeDatabasePortQueue = getQueue({
    name: QUEUE_NAME,
    connection: queueConnection,
  })

  const worker = getWorker<QueueArgs>({
    name: QUEUE_NAME,
    processor: async job => {
      const {
        databaseName,
        databaseType,
        sshDetails,
        serviceDetails,
        serverDetails,
        tenant,
      } = job.data
      let ssh: NodeSSH | null = null
      const payload = await getPayload({ config: configPromise })
      const { action, id: serviceId, previousPorts = [] } = serviceDetails

      try {
        ssh = await dynamicSSH(sshDetails)
        console.log('previous port', serviceDetails.previousPorts)

        // checking for unexposed event and un-exposing ports
        if (action === 'unexpose' && previousPorts?.length) {
          sendEvent({
            pub,
            message: `Un-exposing previous ports ${previousPorts.join(
              ', ',
            )} of ${databaseName}-database`,
            serverId: serverDetails.id,
          })

          const unexposedResponse = await dokku.database.unexpose({
            ssh,
            name: databaseName,
            databaseType,
            ports: previousPorts,
            options: {
              onStdout: async chunk => {
                sendEvent({
                  pub,
                  message: chunk.toString(),
                  serverId: serverDetails.id,
                })
              },
              onStderr: async chunk => {
                sendEvent({
                  pub,
                  message: chunk.toString(),
                  serverId: serverDetails.id,
                })
              },
            },
          })

          if (unexposedResponse.code === 0) {
            sendEvent({
              pub,
              message: `✅ Successfully Unexposed ports ${previousPorts.join(
                ', ',
              )} of ${databaseName}-database`,
              serverId: serverDetails.id,
            })

            await payload.update({
              collection: 'services',
              id: serviceId,
              data: {
                databaseDetails: {
                  exposedPorts: [],
                },
              },
            })
          } else {
            sendEvent({
              pub,
              message: `❌ Failed to Unexpose ports ${previousPorts.join(
                ', ',
              )} of ${databaseName}-database`,
              serverId: serverDetails.id,
            })

            throw Error(unexposedResponse.stderr)
          }
        }
        // checking for expose event & updating ports
        else if (action === 'expose') {
          const portsResponse = await server.ports.available({
            ssh,
            length: databaseType === 'mongo' ? 4 : 1,
          })

          const exposureResponse = await dokku.database.expose({
            ssh,
            name: databaseName,
            databaseType,
            ports: portsResponse,
            options: {
              onStdout: async chunk => {
                sendEvent({
                  pub,
                  message: chunk.toString(),
                  serverId: serverDetails.id,
                })
              },
              onStderr: async chunk => {
                sendEvent({
                  pub,
                  message: chunk.toString(),
                  serverId: serverDetails.id,
                })
              },
            },
          })

          if (exposureResponse.code === 0) {
            sendEvent({
              pub,
              message: `✅ Successfully exposed ${databaseName} on port ${portsResponse.join(', ')}`,
              serverId: serverDetails.id,
            })

            await payload.update({
              collection: 'services',
              data: {
                databaseDetails: {
                  exposedPorts: portsResponse,
                },
              },
              id: serviceDetails.id,
            })
          } else {
            sendEvent({
              pub,
              message: `❌ Failed to expose ${databaseName} on port ${portsResponse.join(', ')}`,
              serverId: serverDetails.id,
            })

            throw Error(exposureResponse.stderr)
          }
        }

        sendActionEvent({
          pub,
          action: 'refresh',
          tenantSlug: tenant.slug,
        })
      } catch (error) {
        let message = error instanceof Error ? error.message : ''

        throw new Error(
          `❌ Failed attaching ports ${databaseName}-database: ${message}`,
        )
      } finally {
        ssh?.dispose()
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

  const id = `expose-database-${data.databaseName}:${new Date().getTime()}`

  return exposeDatabasePortQueue.add(id, data, {
    ...jobOptions,
    jobId: id,
  })
}
