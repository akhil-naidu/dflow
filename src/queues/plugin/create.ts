import { dokku } from '../../lib/dokku'
import { dynamicSSH } from '../../lib/ssh'
import configPromise from '@payload-config'
import { Job, Queue, Worker } from 'bullmq'
import { NodeSSH } from 'node-ssh'
import { getPayload } from 'payload'

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
  //   payload: BasePayload
  pluginDetails: {
    url: string
    name: string
  }
  serverDetails: {
    id: string
    previousPlugins: Server['plugins']
  }
}

const queueName = 'create-plugin'

export const createPluginQueue = new Queue<QueueArgs>(queueName, {
  connection: queueConnection,
})

const worker = new Worker<QueueArgs>(
  queueName,
  async job => {
    const { sshDetails, pluginDetails, serverDetails } = job.data
    const { previousPlugins = [] } = serverDetails
    let ssh: NodeSSH | null = null
    const payload = await getPayload({ config: configPromise })

    console.log('inside install plugin queue')

    try {
      ssh = await dynamicSSH(sshDetails)

      const pluginInstallationResponse = await dokku.plugin.install(
        ssh,
        `${pluginDetails.url} ${pluginDetails.name}`,
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
          },
        },
      )

      if (pluginInstallationResponse.code === 0) {
        sendEvent({
          pub,
          message: `✅ Successfully installed ${pluginDetails.name} plugin`,
          serverId: serverDetails.id,
        })

        sendEvent({
          pub,
          message: `Syncing changes...`,
          serverId: serverDetails.id,
        })

        const pluginsResponse = await dokku.plugin.list(ssh)

        // if previous-plugins are there then removing from previous else updating with server-response
        const filteredPlugins = pluginsResponse.plugins.map(plugin => {
          const previousPluginDetails = (previousPlugins ?? []).find(
            previousPlugin => previousPlugin?.name === plugin?.name,
          )

          return {
            name: plugin.name,
            status: plugin.status
              ? ('enabled' as const)
              : ('disabled' as const),
            version: plugin.version,
            configuration:
              previousPluginDetails?.configuration &&
              typeof previousPluginDetails?.configuration === 'object' &&
              !Array.isArray(previousPluginDetails?.configuration)
                ? previousPluginDetails.configuration
                : {},
          }
        })

        await payload.update({
          collection: 'servers',
          id: serverDetails.id,
          data: {
            plugins: filteredPlugins,
          },
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

worker.on('completed', job => {})

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

export const addCreatePluginQueue = async (data: QueueArgs) => {
  const id = `create-plugin-${data.pluginDetails.name}:${new Date().getTime()}`
  return await createPluginQueue.add(id, data, {
    jobId: id,
    ...jobOptions,
  })
}
