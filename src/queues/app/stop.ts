import { dokku } from '../../lib/dokku'
import { dynamicSSH } from '../../lib/ssh'
import { Job } from 'bullmq'
import { NodeSSH } from 'node-ssh'

import { getQueue, getWorker } from '@/lib/bullmq'
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

export const addStopAppQueue = async (data: QueueArgs) => {
  const QUEUE_NAME = `server-${data?.serverDetails.id}-stop-app`

  const stopAppQueue = getQueue({
    name: QUEUE_NAME,
    connection: queueConnection,
  })

  const worker = getWorker<QueueArgs>({
    name: QUEUE_NAME,
    processor: async job => {
      const { sshDetails, serviceDetails, serverDetails } = job.data

      let ssh: NodeSSH | null = null

      console.log(`starting stopApp queue for ${serviceDetails.name}`)

      try {
        ssh = await dynamicSSH(sshDetails)
        await dokku.process.stop(ssh, serviceDetails.name, {
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
          message: `✅ Successfully stopped ${serviceDetails.name}`,
          serverId: serverDetails.id,
        })
      } catch (error) {
        let message = error instanceof Error ? error.message : ''
        throw new Error(
          `❌ Failed stopping ${serviceDetails?.name}: ${message}`,
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

  const id = `stop-${data.serviceDetails.name}:${new Date().getTime()}`

  return await stopAppQueue.add(QUEUE_NAME, data, {
    jobId: id,
    ...jobOptions,
  })
}
