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

export const addRestartDatabaseQueue = async (data: QueueArgs) => {
  const QUEUE_NAME = `server-${data.serverDetails.id}-restart-database`

  const restartDatabaseQueue = getQueue({
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
        `starting restartDatabase queue for ${databaseType} database called ${databaseName}`,
      )

      try {
        ssh = await dynamicSSH(sshDetails)
        const res = await dokku.database.restart(
          ssh,
          databaseName,
          databaseType,
          {
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
          pub,
          message: `✅ Successfully restarted ${databaseName}-database`,
          serverId: serverDetails.id,
        })

        sendEvent({
          pub,
          message: `Syncing details...`,
          serverId: serverDetails.id,
        })

        const formattedData = parseDatabaseInfo({
          stdout: res.stdout,
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
        throw new Error(
          `❌ Failed restarting ${databaseName}-database: ${message}`,
        )
      } finally {
        if (ssh) {
          ssh.dispose()
        }
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

  const id = `restart-${data.databaseName}:${new Date().getTime()}`

  return await restartDatabaseQueue.add(id, data, {
    jobId: id,
    ...jobOptions,
  })
}
