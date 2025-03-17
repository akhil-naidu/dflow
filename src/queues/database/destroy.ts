import { dokku } from '../../lib/dokku'
import { dynamicSSH } from '../../lib/ssh'
import { Job, Queue, Worker } from 'bullmq'
import { NodeSSH } from 'node-ssh'
import { z } from 'zod'

import { createServiceSchema } from '@/actions/service/validator'
import { jobOptions, pub, queueConnection } from '@/lib/redis'
import { sendEvent } from '@/lib/sendEvent'

const queueName = 'destroy-database'

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

const destroyDatabaseQueue = new Queue<QueueArgs>(queueName, {
  connection: queueConnection,
})

const worker = new Worker<QueueArgs>(
  queueName,
  async job => {
    const { databaseName, databaseType, sshDetails, serverDetails } = job.data
    let ssh: NodeSSH | null = null

    console.log(
      `starting deletingDatabase queue for ${databaseType} database called ${databaseName}`,
    )

    try {
      ssh = await dynamicSSH(sshDetails)
      const deletedResponse = await dokku.database.destroy(
        ssh,
        databaseName,
        databaseType,
        {
          onStdout: async chunk => {
            await sendEvent({
              pub,
              message: chunk.toString(),
              serverId: serverDetails.id,
            })
          },
          onStderr: async chunk => {
            await sendEvent({
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
        await sendEvent({
          pub,
          message: `✅ Successfully deleted ${databaseName}-database`,
          serverId: serverDetails.id,
        })
      }
    } catch (error) {
      let message = error instanceof Error ? error.message : ''
      throw new Error(`❌ Failed deleting ${databaseName}-database: ${message}`)
    } finally {
      if (ssh) {
        ssh.dispose()
      }
    }
  },
  { connection: queueConnection },
)

worker.on('failed', async (job: Job<QueueArgs> | undefined, err) => {
  console.log('Failed to delete database', err)

  const serverDetails = job?.data?.serverDetails

  if (serverDetails) {
    await sendEvent({
      pub,
      message: err.message,
      serverId: serverDetails.id,
    })
  }
})

export const addDestroyDatabaseQueue = async (data: QueueArgs) => {
  const id = `destroy-app-${data.databaseName}:${new Date().getTime()}`
  return await destroyDatabaseQueue.add(id, data, {
    ...jobOptions,
    jobId: id,
  })
}
