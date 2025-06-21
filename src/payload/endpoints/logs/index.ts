import { NodeSSH } from 'node-ssh'
import { LoaderInput } from 'nuqs'
import { APIError, PayloadHandler } from 'payload'

import { dokku } from '@/lib/dokku'
import { loadServiceLogs } from '@/lib/searchParams'
import { dynamicSSH } from '@/lib/ssh'

export const logs: PayloadHandler = async ({ headers, payload, query }) => {
  const auth = await payload.auth({ headers })

  // Throwing 401 if no user is present
  if (!auth.user) {
    throw new APIError('Unauthenticated', 401)
  }

  const { serverId, serviceId } = loadServiceLogs(query as LoaderInput)

  const serverDetails = await payload.findByID({
    collection: 'servers',
    id: serverId,
  })

  const { name, type, databaseDetails } = await payload.findByID({
    collection: 'services',
    id: serviceId,
  })

  if (typeof serverDetails.sshKey === 'string') {
    throw new APIError('Failed to connect to server', 500)
  }

  const sshDetails = {
    host: serverDetails.ip,
    port: serverDetails.port,
    username: serverDetails.username,
    privateKey: serverDetails.sshKey.privateKey,
    hostname: serverDetails.hostname,
  }

  const encoder = new TextEncoder()
  let keepAliveInterval: NodeJS.Timeout | null = null
  let ssh: NodeSSH | null = null

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ message: `🖥️ connecting to ${serverDetails.name} server...` })}\n\n`,
          ),
        )

        ssh = await dynamicSSH(sshDetails)

        if (ssh.isConnected()) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ message: `✅ connected to ${serverDetails.name} server...` })}\n\n`,
            ),
          )

          // Use a separate client for the keepalive ping
          keepAliveInterval = setInterval(() => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ keepalive: true })}\n\n`,
              ),
            )
          }, 30000)

          // Fetching database logs
          if (type === 'database' && databaseDetails?.type) {
            await dokku.database.logs(ssh, name, databaseDetails?.type, {
              onStdout(chunk) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ message: chunk.toString() })}\n\n`,
                  ),
                )
              },
              onStderr(chunk) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ message: chunk.toString() })}\n\n`,
                  ),
                )
              },
            })
          }
        }

        // Fetching app logs
        if (type !== 'database') {
          await dokku.apps.logs(ssh, name, {
            onStdout(chunk) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ message: chunk.toString() })}\n\n`,
                ),
              )
            },
            onStderr(chunk) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ message: chunk.toString() })}\n\n`,
                ),
              )
            },
          })
        }
      } catch (error) {
        let message = ''

        if (error instanceof Error) {
          message = error.message
        }

        // Send error to client
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: `Connection failed: ${message}` })}\n\n`,
          ),
        )

        // Close the stream after error
        controller.close()

        // Clean up resources
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval)
        }
        if (ssh && ssh.isConnected()) {
          ssh.dispose()
        }
      }
    },

    cancel() {
      // Clean up resources when the stream is cancelled
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval)
        keepAliveInterval = null
      }

      if (ssh) {
        ssh.dispose()
      }
      console.log('SSE connection closed, resources cleaned up')
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
