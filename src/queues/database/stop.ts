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
  }
  serverDetails: {
    id: string
  }
  tenant: {
    slug: string
  }
}

export const addStopDatabaseQueue = async (data: QueueArgs) => {
  const QUEUE_NAME = `server-${data.serverDetails.id}-stop-database`

  const stopDatabaseQueue = getQueue({
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

      console.log(
        `starting stopDatabase queue for ${databaseType} database called ${databaseName}`,
      )

      try {
        ssh = await dynamicSSH(sshDetails)
        await dokku.database.stop(ssh, databaseName, databaseType, {
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
        })

        const databaseInfoResponse = await dokku.database.info(
          ssh,
          databaseName,
          databaseType,
        )

        sendEvent({
          pub,
          message: `✅ Successfully stopped ${databaseName}-database`,
          serverId: serverDetails.id,
        })

        sendEvent({
          pub,
          message: `Syncing details...`,
          serverId: serverDetails.id,
        })

        const formattedData = parseDatabaseInfo({
          stdout: databaseInfoResponse.stdout,
          dbType: databaseType,
        })

        await payload.update({
          collection: 'services',
          id: serviceDetails.id,
          data: {
            databaseDetails: {
              ...formattedData,
            },
          },
        })

        sendActionEvent({
          pub,
          action: 'refresh',
          tenantSlug: tenant.slug,
        })
      } catch (error) {
        let message = error instanceof Error ? error.message : ''
        throw new Error(`❌ Failed stop ${databaseName}-database: ${message}`)
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

  const id = `stop-${data.databaseName}:${new Date().getTime()}`

  return await stopDatabaseQueue.add(id, data, {
    jobId: id,
    ...jobOptions,
  })
}
