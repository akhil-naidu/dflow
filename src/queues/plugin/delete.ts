import { dokku } from '../../lib/dokku'
import { dynamicSSH } from '../../lib/ssh'
import { Job, Queue, Worker } from 'bullmq'
import { NodeSSH } from 'node-ssh'

import { payloadWebhook } from '@/lib/payloadWebhook'
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
  pluginDetails: {
    name: string
  }
  serverDetails: {
    id: string
    previousPlugins: Server['plugins']
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
    const { previousPlugins = [] } = serverDetails
    let ssh: NodeSSH | null = null

    try {
      ssh = await dynamicSSH(sshDetails)

      const pluginUninstallationResponse = await dokku.plugin.uninstall(
        ssh,
        pluginDetails.name,
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
          },
        },
      )

      if (pluginUninstallationResponse.code === 0) {
        await sendEvent({
          pub,
          message: `✅ Successfully uninstalled ${pluginDetails.name} plugin`,
          serverId: serverDetails.id,
        })

        await sendEvent({
          pub,
          message: `Syncing changes...`,
          serverId: serverDetails.id,
        })

        const pluginsResponse = await dokku.plugin.list(ssh)

        // if previous-plugins are there then removing from previous else updating with server-response
        const filteredPlugins = previousPlugins
          ? previousPlugins.filter(plugin => plugin.name !== pluginDetails.name)
          : pluginsResponse.plugins.map(plugin => ({
              name: plugin.name,
              status: plugin.status
                ? ('enabled' as const)
                : ('disabled' as const),
              version: plugin.version,
            }))

        const updatePluginResponse = await payloadWebhook({
          payloadToken: `${payloadToken}`,
          data: {
            type: 'plugin.update',
            data: {
              serverId: serverDetails.id,
              plugins: filteredPlugins,
            },
          },
        })

        await pub.publish('refresh-channel', JSON.stringify({ refresh: true }))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      throw new Error(
        `❌ failed to uninstall ${pluginDetails?.name} plugin: ${message}`,
      )
    } finally {
      ssh?.dispose()
    }
  },
  {
    connection: queueConnection,
    // Add concurrency limit
    concurrency: 1,
  },
)

worker.on('failed', async (job: Job<QueueArgs> | undefined, err) => {
  console.log('Failed to uninstall plugin', err)

  if (job?.data) {
    await sendEvent({
      pub,
      message: err.message,
      serverId: job.data.serverDetails.id,
    })
  }
})

export const addDeletePluginQueue = async (data: QueueArgs) => {
  const id = `delete-plugin${data.pluginDetails.name}:${new Date().getTime()}`

  return await deletePluginQueue.add(id, data, {
    jobId: id,
    ...jobOptions,
  })
}
