import { dokku } from '../../lib/dokku'
import { dynamicSSH } from '../../lib/ssh'
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
    name: string
  }
  serverDetails: {
    id: string
  }
}

export const addDestroyApplicationQueue = async (data: QueueArgs) => {
  const QUEUE_NAME = `server-${data?.serverDetails.id}-destroy-application`

  const destroyApplicationQueue = getQueue({
    name: QUEUE_NAME,
    connection: queueConnection,
  })

  getWorker<QueueArgs>({
    name: QUEUE_NAME,
    processor: async job => {
      const { sshDetails, serviceDetails, serverDetails } = job.data
      let ssh: NodeSSH | null = null

      console.log(
        `starting deletingApplication queue for ${serviceDetails.name}`,
      )

      try {
        ssh = await dynamicSSH(sshDetails)

        const deletedResponse = await dokku.apps.destroy(
          ssh,
          serviceDetails.name,
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
                deleteApplicationLogs: {
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
            message: `✅ Successfully deleted ${serviceDetails.name}`,
            serverId: serverDetails.id,
          })
        }
      } catch (error) {
        let message = error instanceof Error ? error.message : ''
        throw new Error(
          `❌ Failed deleting ${serviceDetails?.name}: ${message}`,
        )
      } finally {
        if (ssh) {
          ssh.dispose()
        }
      }
    },
    connection: queueConnection,
  })

  const id = `destroy-app-${data.serviceDetails.name}:${new Date().getTime()}`

  return await destroyApplicationQueue.add(id, data, {
    jobId: id,
    ...jobOptions,
  })
}
