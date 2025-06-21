import { dynamicSSH } from '../../lib/ssh'
import { Job } from 'bullmq'
import { NodeSSH } from 'node-ssh'

import { getQueue, getWorker } from '@/lib/bullmq'
import { dokku } from '@/lib/dokku'
import { jobOptions, pub, queueConnection } from '@/lib/redis'
import { sendEvent } from '@/lib/sendEvent'

interface QueueArgs {
  sshDetails: {
    privateKey: string
    host: string
    username: string
    port: number
    hostname?: string
  }
  serviceDetails: {
    id: string
    name: string
  }
  serverDetails: {
    id: string
  }
}

export const addStartAppQueue = async (data: QueueArgs) => {
  const queueName = `server-${data.serverDetails.id}-start-app`

  const startAppQueue = getQueue({
    name: queueName,
    connection: queueConnection,
  })

  const worker = getWorker<QueueArgs>({
    name: queueName,
    processor: async job => {
      const { sshDetails, serviceDetails, serverDetails } = job.data
      let ssh: NodeSSH | null = null

      console.log(`starting startApp queue for ${serviceDetails.name}`)

      try {
        ssh = await dynamicSSH(sshDetails)
        const res = await dokku.process.start(ssh, serviceDetails.name, {
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

        sendEvent({
          pub,
          message: `✅ Successfully started ${serviceDetails.name}`,
          serverId: serverDetails.id,
        })
      } catch (error) {
        let message = error instanceof Error ? error.message : ''
        throw new Error(
          `❌ Failed starting ${serviceDetails?.name} : ${message}`,
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

  const id = `start-${data.serviceDetails.name}:${new Date().getTime()}`
  return await startAppQueue.add(id, data, {
    jobId: id,
    ...jobOptions,
  })
}
