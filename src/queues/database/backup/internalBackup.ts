import configPromise from '@payload-config'
import { Job } from 'bullmq'
import { NodeSSH } from 'node-ssh'
import { getPayload } from 'payload'

import { getQueue, getWorker } from '@/lib/bullmq'
import { dokku } from '@/lib/dokku'
import { jobOptions, pub, queueConnection } from '@/lib/redis'
import { sendActionEvent, sendEvent } from '@/lib/sendEvent'
import { dynamicSSH } from '@/lib/ssh'
import { Service } from '@/payload-types'

interface QueueArgs {
  databaseType: string
  databaseName: string
  dumpFileName?: string
  type: 'import' | 'export'
  sshDetails: {
    privateKey: string
    host: string
    username: string
    port: number
    hostname?: string
  }
  serverDetails: {
    id: string
  }
  serviceId: Service['id']
  backupId: string
  tenant: {
    slug: string
  }
}

export const addInternalBackupQueue = async (data: QueueArgs) => {
  const QUEUE_NAME = `server-${data.serverDetails.id}-database-backup-internal`

  const internalBackupQueue = getQueue({
    name: QUEUE_NAME,
    connection: queueConnection,
  })

  const worker = getWorker<QueueArgs>({
    name: QUEUE_NAME,
    processor: async job => {
      const payload = await getPayload({ config: configPromise })
      const {
        databaseName,
        databaseType,
        sshDetails,
        serverDetails,
        type,
        dumpFileName,
        backupId,
        tenant,
      } = job.data

      let ssh: NodeSSH | null = null

      console.log(
        `starting ${type} backup for ${databaseType} database called ${databaseName} `,
      )

      try {
        ssh = await dynamicSSH(sshDetails)

        if (type === 'import') {
          const { createdAt: backupCreatedTime } = await payload.findByID({
            collection: 'backups',
            id: backupId ?? '',
          })

          const backupCreatedDate = new Date(backupCreatedTime)

          const formattedDate = [
            backupCreatedDate.getUTCFullYear(),
            String(backupCreatedDate.getUTCMonth() + 1).padStart(2, '0'),
            String(backupCreatedDate.getUTCDate()).padStart(2, '0'),
            String(backupCreatedDate.getUTCHours()).padStart(2, '0'),
            String(backupCreatedDate.getUTCMinutes()).padStart(2, '0'),
            String(backupCreatedDate.getUTCSeconds()).padStart(2, '0'),
          ].join('-')
          const generatedDumpFileName = `${databaseName}-${formattedDate}.dump`

          const result = await dokku.database.internal.import(
            ssh,
            databaseType,
            databaseName,
            generatedDumpFileName,
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
              },
            },
          )

          if (result.code === 0) {
            sendEvent({
              pub,
              message: `✅ Imported backup for ${databaseType} database called ${databaseName} was successful`,
              serverId: serverDetails.id,
            })
          }
        } else {
          const result = await dokku.database.internal.export(
            ssh,
            databaseType,
            databaseName,
            dumpFileName ?? '',
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
              },
            },
          )

          if (result.code === 0) {
            sendEvent({
              pub,
              message: `✅ Exported backup for ${databaseType} database called ${databaseName} was successful`,
              serverId: serverDetails.id,
            })

            await payload.update({
              collection: 'backups',
              data: {
                status: 'success',
              },
              id: backupId,
            })
          }

          sendActionEvent({
            pub,
            action: 'refresh',
            tenantSlug: tenant.slug,
          })
        }
      } catch (error) {
        let message = error instanceof Error ? error.message : ''
        throw new Error(
          `❌ ${type} backup for ${databaseType} database called ${databaseName} failed: ${message}`,
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
    const serverDetails = job?.data?.serverDetails

    if (serverDetails) {
      sendEvent({
        pub,
        message: err.message,
        serverId: serverDetails.id,
      })
    }
  })

  const id = `backup-internal-${data.databaseType}-${data.databaseName}:${new Date().getTime()}`

  return await internalBackupQueue.add(id, data, {
    ...jobOptions,
    jobId: id,
  })
}
