import { dokku } from '../../lib/dokku'
import { dynamicSSH } from '../../lib/ssh'
import { Job, Queue, Worker } from 'bullmq'
import { NodeSSH } from 'node-ssh'

import { jobOptions, pub, queueConnection } from '@/lib/redis'
import { sendEvent } from '@/lib/sendEvent'
import { Server } from '@/payload-types'

interface QueueArgs {
  sshDetails: {
    host: string
    port: number
    username: string
    privateKey: string
  }
  serverDetails: {
    id: string
    provider: Server['provider']
  }
}

const queueName = 'install-dokku'

export const installDokkuQueue = new Queue<QueueArgs>(queueName, {
  connection: queueConnection,
})

const worker = new Worker<QueueArgs>(
  queueName,
  async job => {
    const { sshDetails, serverDetails } = job.data
    let ssh: NodeSSH | null = null

    console.log('inside install plugin queue')

    try {
      ssh = await dynamicSSH(sshDetails)

      const installationResponse = await dokku.version.install(ssh, {
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

      if (installationResponse.code === 0) {
        // For AWS, add the dokku permission to ubuntu user
        if (serverDetails.provider === 'aws') {
          await ssh.execCommand('sudo usermod -aG dokku ubuntu')
        }

        sendEvent({
          pub,
          message: `✅ Successfully installed dokku`,
          serverId: serverDetails.id,
        })

        sendEvent({
          pub,
          message: `Syncing changes...`,
          serverId: serverDetails.id,
        })

        await pub.publish('refresh-channel', JSON.stringify({ refresh: true }))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      throw new Error(`❌ failed to install plugin: ${message}`)
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
  console.log('Failed to install plugin', err)

  if (job?.data) {
    sendEvent({
      pub,
      message: err.message,
      serverId: job.data.serverDetails.id,
    })
  }
})

export const addInstallDokkuQueue = async (data: QueueArgs) => {
  const id = `install-dokku:${new Date().getTime()}`

  return await installDokkuQueue.add(id, data, {
    jobId: id,
    ...jobOptions,
  })
}
