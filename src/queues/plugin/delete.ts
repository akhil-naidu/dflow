import { dokku } from '../../lib/dokku'
import { dynamicSSH } from '../../lib/ssh'
import { Job, Queue, Worker } from 'bullmq'

import { payloadWebhook } from '@/lib/payloadWebhook'
import { pub, queueConnection } from '@/lib/redis'

interface QueueArgs {
  sshDetails: {
    host: string
    port: number
    username: string
    privateKey: string
  }
  pluginDetails: {
    name: string
  }
  serverDetails: {
    id: string
  }
  payloadToken: string | undefined
}

const queueName = 'delete-plugin'

export const deletePluginQueue = new Queue<QueueArgs>(queueName, {
  connection: queueConnection,
})

const worker = new Worker<QueueArgs>(
  queueName,
  async job => {
    const { sshDetails, pluginDetails, serverDetails, payloadToken } = job.data

    try {
      const ssh = await dynamicSSH(sshDetails)

      const pluginUninstallationResponse = await dokku.plugin.uninstall(
        ssh,
        pluginDetails.name,
        {
          onStdout: async chunk => {
            await pub.publish('my-channel', chunk.toString())
          },
          onStderr: async chunk => {
            await pub.publish('my-channel', chunk.toString())
          },
        },
      )

      if (pluginUninstallationResponse.code === 0) {
        await pub.publish(
          'my-channel',
          `✅ Successfully uninstalled ${pluginDetails.name} plugin`,
        )

        await pub.publish('my-channel', `Syncing changes...`)

        const pluginsResponse = await dokku.plugin.list(ssh)

        const updatePluginResponse = await payloadWebhook({
          payloadToken: `${payloadToken}`,
          data: {
            type: 'plugin.update',
            data: {
              serverId: serverDetails.id,
              plugins: pluginsResponse.plugins.map(plugin => ({
                name: plugin.name,
                status: plugin.status ? 'enabled' : 'disabled',
                version: plugin.version,
              })),
            },
          },
        })

        await pub.publish('refresh-channel', JSON.stringify({ refresh: true }))
      }

      ssh.dispose()
    } catch (error) {
      throw error // Re-throw to trigger the failed event
    }
  },
  {
    connection: queueConnection,
    // Add concurrency limit
    concurrency: 1,
  },
)

worker.on('completed', job => {})

worker.on('failed', async (job: Job<QueueArgs> | undefined, err) => {
  console.log('Failed to uninstall plugin', err)

  await pub.publish('my-channel', '❌ failed to uninstall plugin')

  if (job?.data) {
    const { pluginDetails } = job.data
  }
})

// Add more event handlers for better debugging
worker.on('error', err => {})

worker.on('active', job => {})
