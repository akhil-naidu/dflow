import { dokku } from '../../lib/dokku'
import { dynamicSSH } from '../../lib/ssh'
import configPromise from '@payload-config'
import { Job } from 'bullmq'
import { NodeSSH } from 'node-ssh'
import { getPayload } from 'payload'

import { getQueue, getWorker } from '@/lib/bullmq'
import { jobOptions, pub, queueConnection } from '@/lib/redis'
import { sendActionEvent, sendEvent } from '@/lib/sendEvent'

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
    deploymentId: string
  }
  serverDetails: {
    id: string
  }
  tenantSlug: string
}

export const addRebuildAppQueue = async (data: QueueArgs) => {
  const QUEUE_NAME = `server-${data?.serverDetails?.id}-rebuild-app`

  const restartAppQueue = getQueue({
    name: QUEUE_NAME,
    connection: queueConnection,
  })

  const worker = getWorker<QueueArgs>({
    name: QUEUE_NAME,
    processor: async job => {
      const { sshDetails, serviceDetails, serverDetails, tenantSlug } = job.data
      const payload = await getPayload({ config: configPromise })
      let ssh: NodeSSH | null = null

      console.log(`starting rebuildApp queue for ${serviceDetails.name}`)

      try {
        await payload.update({
          collection: 'deployments',
          data: {
            status: 'building',
          },
          id: serviceDetails.deploymentId,
        })

        sendActionEvent({
          pub,
          action: 'refresh',
          tenantSlug,
        })

        sendActionEvent({
          pub,
          action: 'refresh',
          tenantSlug,
        })

        ssh = await dynamicSSH(sshDetails)
        const res = await dokku.process.rebuild(ssh, serviceDetails.name, {
          onStdout: async chunk => {
            sendEvent({
              pub,
              message: chunk.toString(),
              serverId: serverDetails.id,
              serviceId: serviceDetails.id,
              channelId: serviceDetails.deploymentId,
            })
          },
          onStderr: async chunk => {
            sendEvent({
              pub,
              message: chunk.toString(),
              serverId: serverDetails.id,
              serviceId: serviceDetails.id,
              channelId: serviceDetails.deploymentId,
            })
          },
        })

        if (res.code === 0) {
          sendEvent({
            pub,
            message: `✅ Successfully rebuilt ${serviceDetails.name}`,
            serverId: serverDetails.id,
          })

          const logs = (
            await pub.lrange(serviceDetails.deploymentId, 0, -1)
          ).reverse()

          await payload.update({
            collection: 'deployments',
            id: serviceDetails.deploymentId,
            data: {
              status: 'success',
              logs,
            },
          })

          sendActionEvent({
            pub,
            action: 'refresh',
            tenantSlug,
          })
        } else {
          throw Error(res.stderr)
        }
      } catch (error) {
        let message = error instanceof Error ? error.message : ''

        sendEvent({
          message,
          pub,
          serverId: serverDetails.id,
          serviceId: serviceDetails.id,
          channelId: serviceDetails.deploymentId,
        })

        const logs = (
          await pub.lrange(serviceDetails.deploymentId, 0, -1)
        ).reverse()

        await payload.update({
          collection: 'deployments',
          data: {
            status: 'failed',
            logs,
          },
          id: serviceDetails.deploymentId,
        })

        sendActionEvent({
          pub,
          action: 'refresh',
          tenantSlug,
        })

        throw new Error(`❌ Failed to rebuild app: ${message}`)
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

  const id = `rebuild-${data.serviceDetails.name}:${new Date().getTime()}`

  return await restartAppQueue.add(id, data, {
    jobId: id,
    ...jobOptions,
  })
}
