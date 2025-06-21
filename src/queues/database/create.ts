import { dokku } from '../../lib/dokku'
import { dynamicSSH } from '../../lib/ssh'
import configPromise from '@payload-config'
import { NodeSSH } from 'node-ssh'
import { getPayload } from 'payload'
import { z } from 'zod'

import { createServiceSchema } from '@/actions/service/validator'
import { getQueue, getWorker } from '@/lib/bullmq'
import { jobOptions, pub, queueConnection } from '@/lib/redis'
import { sendActionEvent, sendEvent } from '@/lib/sendEvent'
import { parseDatabaseInfo } from '@/lib/utils'

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
    id: string
    deploymentId: string
    serverId: string
  }
  tenant: {
    slug: string
  }
}

export const addCreateDatabaseQueue = async (data: QueueArgs) => {
  const QUEUE_NAME = `server-${data?.serviceDetails?.serverId}-create-database`

  const createDatabaseQueue = getQueue({
    name: QUEUE_NAME,
    connection: queueConnection,
  })

  getWorker<QueueArgs>({
    name: QUEUE_NAME,
    connection: queueConnection,
    processor: async job => {
      const payload = await getPayload({ config: configPromise })
      const { databaseName, databaseType, sshDetails, serviceDetails, tenant } =
        job.data
      const { id: serviceId, serverId, deploymentId } = serviceDetails
      let ssh: NodeSSH | null = null

      try {
        console.log(
          `starting createDatabase queue for ${databaseType} database called ${databaseName}`,
        )

        // updating the deployment status to building
        await payload.update({
          collection: 'deployments',
          id: serviceDetails.deploymentId,
          data: {
            status: 'building',
          },
        })

        sendActionEvent({
          pub,
          action: 'refresh',
          tenantSlug: tenant.slug,
        })

        ssh = await dynamicSSH(sshDetails)

        const res = await dokku.database.create(
          ssh,
          databaseName,
          databaseType,
          {
            onStdout: async chunk => {
              sendEvent({
                message: chunk.toString(),
                pub,
                serverId,
                serviceId,
                channelId: serviceDetails.deploymentId,
              })
            },
            onStderr: async chunk => {
              sendEvent({
                message: chunk.toString(),
                pub,
                serverId,
                serviceId,
                channelId: serviceDetails.deploymentId,
              })

              console.info({
                createDatabaseLogs: {
                  message: chunk.toString(),
                  type: 'stdout',
                },
              })
            },
          },
        )

        sendEvent({
          message: `✅ Successfully created ${databaseName}-database, updated details...`,
          pub,
          serverId,
          serviceId,
        })

        sendEvent({
          message: `Syncing details...`,
          pub,
          serverId,
          serviceId,
        })

        const formattedData = parseDatabaseInfo({
          stdout: res.stdout,
          dbType: databaseType,
        })

        await payload.update({
          collection: 'services',
          id: serviceId,
          data: {
            databaseDetails: {
              ...formattedData,
            },
          },
        })

        const logs = await pub.lrange(deploymentId, 0, -1)

        await payload.update({
          collection: 'deployments',
          id: serviceDetails.deploymentId,
          data: {
            status: 'success',
            logs,
          },
        })
      } catch (error) {
        let message = error instanceof Error ? error.message : ''

        sendEvent({
          message,
          pub,
          serverId,
          serviceId,
          channelId: serviceDetails.deploymentId,
        })

        const logs = await pub.lrange(deploymentId, 0, -1)

        await payload.update({
          collection: 'deployments',
          id: serviceDetails.deploymentId,
          data: {
            status: 'failed',
            logs,
          },
        })

        throw new Error(
          `❌ Failed creating ${databaseName}-database: ${message}`,
        )
      } finally {
        sendActionEvent({
          pub,
          action: 'refresh',
          tenantSlug: tenant.slug,
        })

        if (ssh) {
          ssh.dispose()
        }
      }
    },
  })

  const id = `create-database-${data.databaseName}-${data.databaseType}:${new Date().getTime()}`

  return await createDatabaseQueue.add(id, data, { ...jobOptions, jobId: id })
}
