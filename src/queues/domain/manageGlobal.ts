import { dokku } from '../../lib/dokku'
import { dynamicSSH } from '../../lib/ssh'
import configPromise from '@payload-config'
import { Job } from 'bullmq'
import { NodeSSH, SSHExecCommandResponse } from 'node-ssh'
import { getPayload } from 'payload'
import { z } from 'zod'

import { createServiceSchema } from '@/actions/service/validator'
import { getQueue, getWorker } from '@/lib/bullmq'
import { jobOptions, pub, queueConnection } from '@/lib/redis'
import { sendActionEvent, sendEvent } from '@/lib/sendEvent'

export type DatabaseType = Exclude<
  z.infer<typeof createServiceSchema>['databaseType'],
  undefined
>

interface QueueArgs {
  sshDetails: {
    privateKey: string
    host: string
    username: string
    port: number
    hostname?: string
  }
  serverDetails: {
    global: {
      domains: string[]
      action: 'add' | 'remove' | 'set'
    }
    id: string
  }
  tenant: {
    slug: string
  }
}

export const addManageServerDomainQueue = async (data: QueueArgs) => {
  const QUEUE_NAME = `server-${data.serverDetails.id}-manage-server-domain`

  const manageServerDomainQueue = getQueue({
    name: QUEUE_NAME,
    connection: queueConnection,
  })

  const worker = getWorker<QueueArgs>({
    name: QUEUE_NAME,
    processor: async job => {
      const { sshDetails, serverDetails, tenant } = job.data
      const { global } = job.data.serverDetails
      const payload = await getPayload({ config: configPromise })

      let ssh: NodeSSH | null = null

      try {
        ssh = await dynamicSSH(sshDetails)

        let executionResponse: SSHExecCommandResponse = {
          code: -1,
          signal: null,
          stdout: '',
          stderr: '',
        }

        if (global) {
          switch (global.action) {
            case 'add':
              executionResponse = await dokku.domains.addGlobal({
                ssh,
                domains: global.domains,
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
              break
            case 'remove':
              executionResponse = await dokku.domains.removeGlobal({
                ssh,
                domains: global.domains,
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
              break
            case 'set':
              executionResponse = await dokku.domains.setGlobal({
                ssh,
                domains: global.domains,
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
              break
            default:
              break
          }

          if (executionResponse.code === 0) {
            sendEvent({
              pub,
              message: `✅ Successfully ${global.action}ed global domain ${global.domains.join(', ')}, updating details...`,
              serverId: serverDetails.id,
            })

            // 1. updating server domains status based on the global domains list
            // 2. sending refresh event to the client
            if (global.action === 'add' || global.action === 'set') {
              const domains = await dokku.domains.listGlobal({ ssh })

              const server = await payload.findByID({
                collection: 'servers',
                id: serverDetails.id,
              })

              const newDomains = (server.domains ?? []).map(domain => ({
                domain: domain.domain,
                synced: domains.includes(domain.domain),
                default: false,
              }))

              if (server) {
                await payload.update({
                  collection: 'servers',
                  id: serverDetails.id,
                  data: {
                    domains: newDomains,
                  },
                })

                sendActionEvent({
                  pub,
                  action: 'refresh',
                  tenantSlug: tenant.slug,
                })
              }
            }
          }
        }
      } catch (error) {
        let message = error instanceof Error ? error.message : ''

        throw new Error(
          `❌ failed to ${serverDetails?.global.action} for domain ${serverDetails?.global?.domains.join(', ')}: ${message}`,
        )
      } finally {
        ssh?.dispose()
      }
    },
    connection: queueConnection,
  })

  worker.on('failed', async (job: Job<QueueArgs> | undefined, err) => {
    console.log('Failed during global-domain operation', err)

    if (job?.data) {
      sendEvent({
        pub,
        message: err.message,
        serverId: job.data.serverDetails.id,
      })
    }
  })

  const id = `manage-global-domain-${data.serverDetails.global?.domains.join(', ')}-:${new Date().getTime()}`

  return await manageServerDomainQueue.add(id, data, {
    jobId: id,
    ...jobOptions,
  })
}
