import { netdata } from '../../lib/netdata'
import { dynamicSSH } from '../../lib/ssh'
import { Job, Queue, Worker } from 'bullmq'
import { NodeSSH } from 'node-ssh'

import { jobOptions, pub, queueConnection } from '@/lib/redis'
import { sendEvent } from '@/lib/sendEvent'

interface QueueArgs {
  sshDetails: {
    host: string
    port: number
    username: string
    privateKey: string
  }
  serverDetails: {
    id: string
  }
}

const queueName = 'install-netdata'

export const installNetdataQueue = new Queue<QueueArgs>(queueName, {
  connection: queueConnection,
})

const worker = new Worker<QueueArgs>(
  queueName,
  async job => {
    const { sshDetails, serverDetails } = job.data
    let ssh: NodeSSH | null = null

    console.log('inside install netdata queue')

    try {
      ssh = await dynamicSSH(sshDetails)

      sendEvent({
        pub,
        message: `Starting Netdata installation...`,
        serverId: serverDetails.id,
      })

      const installResponse = await netdata.core.install({
        ssh,
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
          },
        },
      })

      if (installResponse.success) {
        sendEvent({
          pub,
          message: `✅ Successfully installed Netdata: ${installResponse.message}`,
          serverId: serverDetails.id,
        })

        // Enable and start Netdata service
        const enableResponse = await netdata.core.enable({
          ssh,
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
            },
          },
        })

        if (enableResponse.success) {
          sendEvent({
            pub,
            message: `✅ Successfully enabled and started Netdata service`,
            serverId: serverDetails.id,
          })
        } else {
          throw new Error(
            `Failed to enable Netdata service: ${enableResponse.message}`,
          )
        }

        sendEvent({
          pub,
          message: `Syncing changes...`,
          serverId: serverDetails.id,
        })

        await pub.publish('refresh-channel', JSON.stringify({ refresh: true }))
      } else {
        throw new Error(`Failed to install Netdata: ${installResponse.message}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      throw new Error(`❌ Failed to install Netdata: ${message}`)
    } finally {
      if (ssh) {
        ssh.dispose()
      }
    }
  },
  {
    connection: queueConnection,
    // Add concurrency limit
    concurrency: 1,
  },
)

worker.on('failed', async (job: Job<QueueArgs> | undefined, err) => {
  console.log('Failed to install Netdata', err)

  if (job?.data) {
    sendEvent({
      pub,
      message: err.message,
      serverId: job.data.serverDetails.id,
    })
  }
})

export const addInstallNetdataQueue = async (data: QueueArgs) => {
  const id = `install-netdata:${new Date().getTime()}`

  return await installNetdataQueue.add(id, data, {
    jobId: id,
    ...jobOptions,
  })
}
