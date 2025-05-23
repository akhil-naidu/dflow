import { dokku } from '../../lib/dokku'
import { dynamicSSH } from '../../lib/ssh'
import { Job } from 'bullmq'
import { NodeSSH } from 'node-ssh'
import { z } from 'zod'

import { createServiceSchema } from '@/actions/service/validator'
import { getQueue, getWorker } from '@/lib/bullmq'
import { jobOptions, pub, queueConnection } from '@/lib/redis'
import { sendEvent } from '@/lib/sendEvent'

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
  }
  serverDetails: {
    id: string
  }
}

export const addDestroyDatabaseQueue = async (data: QueueArgs) => {
  const QUEUE_NAME = `server-${data.serverDetails.id}-destroy-database`

  const destroyDatabaseQueue = getQueue({
    name: QUEUE_NAME,
    connection: queueConnection,
  })

  const worker = getWorker<QueueArgs>({
    name: QUEUE_NAME,
    processor: async job => {
      const { databaseName, databaseType, sshDetails, serverDetails } = job.data
      let ssh: NodeSSH | null = null

      console.log(
        `starting deletingDatabase queue for ${databaseType} database called ${databaseName}`,
      )

      try {
        ssh = await dynamicSSH(sshDetails)
        // 1. Unlink database from all-apps before deleting
        const linkedAppsList = await dokku.database.listLinks({
          ssh,
          databaseName,
          databaseType,
        })

        // unlinking all apps connected to database
        if (linkedAppsList.length) {
          for await (const app of linkedAppsList) {
            // Add validation for app name
            if (!app.trim()) {
              console.warn(`Skipping invalid app name: "${app}"`)
              continue
            }

            const unlinkResponse = await dokku.database.unlink({
              ssh,
              databaseName,
              databaseType,
              appName: app,
              noRestart: true,
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

                  console.info({
                    createDatabaseLogs: {
                      message: chunk.toString(),
                      type: 'stdout',
                    },
                  })
                },
              },
            })

            // if there is failure while unlinking database thronging error
            if (unlinkResponse.code !== 0) {
              throw new Error(`unlinking ${databaseName} from ${app} failed!`)
            }
          }
        }

        const deletedResponse = await dokku.database.destroy(
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

        if (deletedResponse) {
          sendEvent({
            pub,
            message: `✅ Successfully deleted ${databaseName}-database`,
            serverId: serverDetails.id,
          })
        }
      } catch (error) {
        let message = error instanceof Error ? error.message : ''
        throw new Error(
          `❌ Failed deleting ${databaseName}-database: ${message}`,
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

  const id = `destroy-app-${data.databaseName}:${new Date().getTime()}`

  return await destroyDatabaseQueue.add(id, data, {
    ...jobOptions,
    jobId: id,
  })
}
