import configPromise from '@payload-config'
import { Job } from 'bullmq'
import { NodeSSH } from 'node-ssh'
import { getPayload } from 'payload'

import { getQueue, getWorker } from '@/lib/bullmq'
import { dokku } from '@/lib/dokku'
import { jobOptions, pub, queueConnection } from '@/lib/redis'
import { sendActionEvent, sendEvent } from '@/lib/sendEvent'
import { dynamicSSH } from '@/lib/ssh'

interface QueueArgs {
  databaseType: string
  databaseName: string
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
  serviceId?: string
  backupId: string
  tenant: {
    slug: string
  }
}

export const deleteInternalBackupQueue = async (data: QueueArgs) => {
  const QUEUE_NAME = `server-${data.serverDetails.id}-internal-backup-delete`

  const internalBackupDeleteQueue = getQueue({
    name: QUEUE_NAME,
    connection: queueConnection,
  })

  const worker = getWorker<QueueArgs>({
    name: QUEUE_NAME,
    processor: async job => {
      const payload = await getPayload({ config: configPromise })
      const {
        sshDetails,
        serverDetails,
        databaseType,
        databaseName,
        backupId,
        tenant,
      } = job.data

      let ssh: NodeSSH | null = null

      console.log(`Deleting backup for database called ${databaseName} `)

      try {
        ssh = await dynamicSSH(sshDetails)

        const { createdAt: backupCreatedTime } = await payload.findByID({
          collection: 'backups',
          id: backupId,
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
        const fileName = `${databaseName}-${formattedDate}.dump`

        const result = await dokku.database.internal.delete({
          ssh,
          backupFileName: [fileName],
          options: {
            onStdout(chunk) {
              sendEvent({
                pub,
                message: chunk.toString(),
                serverId: serverDetails.id,
              })
            },
            onStderr(chunk) {
              sendEvent({
                pub,
                message: chunk.toString(),
                serverId: serverDetails.id,
              })
            },
          },
        })

        if (result.code === 0) {
          sendEvent({
            pub,
            message: `✅ Successfully deleted ${fileName}`,
            serverId: serverDetails.id,
          })

          await payload.update({
            collection: 'backups',
            id: backupId,
            data: {
              deletedAt: new Date().toISOString(),
            },
          })

          sendActionEvent({
            pub,
            action: 'refresh',
            tenantSlug: tenant.slug,
          })
        }
      } catch (error) {
        let message = error instanceof Error ? error.message : ''
        throw new Error(
          `❌ Backup delete failed for the database ${databaseName}: ${message}`,
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

  const id = `delete-internal-backup-${data.backupId}:${new Date().getTime()}`

  return await internalBackupDeleteQueue.add(id, data, {
    ...jobOptions,
    jobId: id,
  })
}
