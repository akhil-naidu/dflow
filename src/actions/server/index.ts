'use server'

import dns from 'dns/promises'
import isPortReachable from 'is-port-reachable'
import { revalidatePath } from 'next/cache'

import { protectedClient } from '@/lib/safe-action'
import { server } from '@/lib/server'
import { dynamicSSH } from '@/lib/ssh'
import { addInstallRailpackQueue } from '@/queues/builder/installRailpack'
import { addInstallDokkuQueue } from '@/queues/dokku/install'
import { addManageServerDomainQueue } from '@/queues/domain/manageGlobal'
import { addDeleteProjectsQueue } from '@/queues/project/deleteProjects'

import {
  checkDNSConfigSchema,
  checkServerConnectionSchema,
  completeServerOnboardingSchema,
  createServerSchema,
  deleteServerSchema,
  installDokkuSchema,
  updateServerDomainSchema,
  updateServerSchema,
} from './validator'

// No need to handle try/catch that abstraction is taken care by next-safe-actions
export const createServerAction = protectedClient
  .metadata({
    // This action name can be used for sentry tracking
    actionName: 'createServerAction',
  })
  .schema(createServerSchema)
  .action(async ({ clientInput, ctx }) => {
    const { name, description, ip, port, username, sshKey } = clientInput
    const {
      userTenant: { tenant },
      payload,
      user,
    } = ctx

    const response = await payload.create({
      collection: 'servers',
      data: {
        name,
        description,
        ip,
        port,
        username,
        sshKey,
        provider: 'other',
        tenant,
      },
      user,
    })

    if (response) {
      revalidatePath(`/${tenant.slug}/servers`)
    }

    return { success: true, server: response }
  })

export const updateServerAction = protectedClient
  .metadata({
    actionName: 'updateServerAction',
  })
  .schema(updateServerSchema)
  .action(async ({ clientInput, ctx }) => {
    const { id, ...data } = clientInput
    const { payload, user } = ctx

    const response = await payload.update({
      id,
      data,
      collection: 'servers',
      user,
    })

    if (response) {
      revalidatePath(`/servers/${id}`)
      revalidatePath(`/onboarding/add-server`)
    }

    return { success: true, server: response }
  })

export const deleteServerAction = protectedClient
  .metadata({
    // This action name can be used for sentry tracking
    actionName: 'deleteServerAction',
  })
  .schema(deleteServerSchema)
  .action(async ({ clientInput, ctx }) => {
    const { id, deleteProjects, deleteBackups } = clientInput
    const { payload, userTenant } = ctx

    const response = await payload.update({
      collection: 'servers',
      id,
      data: {
        deletedAt: new Date().toISOString(),
      },
    })

    const installationResponse = await addDeleteProjectsQueue({
      serverDetails: {
        id,
      },
      deleteProjectsFromServer: deleteProjects,
      deleteBackups,
      tenant: {
        slug: userTenant.tenant.slug,
      },
    })

    if (response && installationResponse.id) {
      revalidatePath(`${userTenant.tenant}/dashboard`)
      revalidatePath(`${userTenant.tenant}/servers`)
      revalidatePath(`${userTenant.tenant}/servers/${id}`)
      return { deleted: true }
    }
  })

export const installDokkuAction = protectedClient
  .metadata({
    actionName: 'installDokkuAction',
  })
  .schema(installDokkuSchema)
  .action(async ({ clientInput, ctx }) => {
    const { serverId } = clientInput
    const { payload, userTenant } = ctx

    const serverDetails = await payload.findByID({
      collection: 'servers',
      id: serverId,
      depth: 10,
    })

    if (typeof serverDetails.sshKey === 'object') {
      const installationResponse = await addInstallDokkuQueue({
        serverDetails: {
          id: serverId,
          provider: serverDetails.provider,
        },
        sshDetails: {
          host: serverDetails.ip,
          port: serverDetails.port,
          privateKey: serverDetails.sshKey.privateKey,
          username: serverDetails.username,
        },
        tenant: {
          slug: userTenant.tenant.slug,
        },
      })

      if (installationResponse.id) {
        return { success: true }
      }
    }
  })

export const updateServerDomainAction = protectedClient
  .metadata({
    actionName: 'updateServerDomainAction',
  })
  .schema(updateServerDomainSchema)
  .action(async ({ clientInput, ctx }) => {
    const { id, domains, operation } = clientInput
    const { payload, userTenant } = ctx

    // Fetching server-details for showing previous details
    const { domains: serverPreviousDomains } = await payload.findByID({
      id,
      collection: 'servers',
    })

    const previousDomains = serverPreviousDomains ?? []

    const filteredDomains =
      operation !== 'remove'
        ? [
            ...previousDomains,
            ...domains.map(domain => ({
              domain,
              default: operation === 'set',
            })),
          ]
        : previousDomains.filter(
            prevDomain => !domains.includes(prevDomain.domain),
          )

    const response = await payload.update({
      id,
      data: {
        domains: filteredDomains,
      },
      collection: 'servers',
      depth: 10,
    })

    const privateKey =
      typeof response.sshKey === 'object' ? response.sshKey.privateKey : ''

    // for delete action remove domain from dokku
    if (operation === 'remove') {
      await addManageServerDomainQueue({
        serverDetails: {
          global: {
            domains,
            action: operation,
          },
          id,
        },
        sshDetails: {
          host: response.ip,
          port: response.port,
          username: response.username,
          privateKey,
        },
        tenant: {
          slug: userTenant.tenant.slug,
        },
      })
    }

    revalidatePath(`/servers/${id}`)
    return { success: true }
  })

export const installRailpackAction = protectedClient
  .metadata({
    actionName: 'installRailpackAction',
  })
  .schema(installDokkuSchema)
  .action(async ({ clientInput, ctx }) => {
    const { serverId } = clientInput
    const { payload, userTenant } = ctx

    const serverDetails = await payload.findByID({
      collection: 'servers',
      id: serverId,
      depth: 10,
    })

    if (typeof serverDetails.sshKey === 'object') {
      const installationResponse = await addInstallRailpackQueue({
        serverDetails: {
          id: serverId,
        },
        sshDetails: {
          host: serverDetails.ip,
          port: serverDetails.port,
          privateKey: serverDetails.sshKey.privateKey,
          username: serverDetails.username,
        },
        tenant: {
          slug: userTenant.tenant.slug,
        },
      })

      if (installationResponse.id) {
        return { success: true }
      }
    }
  })

export const completeServerOnboardingAction = protectedClient
  .metadata({
    actionName: 'completeServerOnboardingAction',
  })
  .schema(completeServerOnboardingSchema)
  .action(async ({ clientInput, ctx }) => {
    const { serverId } = clientInput
    const { payload, userTenant } = ctx

    const response = await payload.update({
      id: serverId,
      data: {
        onboarded: true,
      },
      collection: 'servers',
    })

    if (response) {
      revalidatePath(`${userTenant.tenant}/servers/${serverId}`)
      return { success: true, server: response }
    }

    return { success: false }
  })

export const getServersAction = protectedClient
  .metadata({
    actionName: 'getServersAction',
  })
  .action(async ({ ctx }) => {
    const { payload } = ctx

    const { docs } = await payload.find({
      collection: 'servers',
      select: {
        name: true,
      },
      pagination: false,
    })

    return docs
  })

export const checkDNSConfigAction = protectedClient
  .metadata({
    actionName: 'checkDNSConfigAction',
  })
  .schema(checkDNSConfigSchema)
  .action(async ({ clientInput }) => {
    const { domain, ip } = clientInput

    const addresses = await dns.resolve4(domain)

    return addresses.includes(ip)
  })

export const syncServerDomainAction = protectedClient
  .metadata({
    actionName: 'syncServerDomainAction',
  })
  .schema(updateServerDomainSchema)
  .action(async ({ clientInput, ctx }) => {
    const { id, domains, operation } = clientInput
    const { payload, userTenant } = ctx

    const response = await payload.findByID({
      id,
      collection: 'servers',
      depth: 10,
    })

    const privateKey =
      typeof response.sshKey === 'object' ? response.sshKey.privateKey : ''

    const queueResponse = await addManageServerDomainQueue({
      serverDetails: {
        global: {
          domains,
          action: operation,
        },
        id,
      },
      sshDetails: {
        host: response.ip,
        port: response.port,
        username: response.username,
        privateKey,
      },
      tenant: {
        slug: userTenant.tenant.slug,
      },
    })

    if (queueResponse.id) {
      return { success: true }
    }
  })

export const checkServerConnection = protectedClient
  .metadata({
    actionName: 'checkServerConnection',
  })
  .schema(checkServerConnectionSchema)
  .action(async ({ clientInput }) => {
    const { ip, port, username, privateKey } = clientInput

    try {
      // Validate input parameters
      if (!ip || !port || !username || !privateKey) {
        return {
          isConnected: false,
          portIsOpen: false,
          sshConnected: false,
          serverInfo: null,
          error: 'Missing required connection parameters',
        }
      }

      // Check if port is reachable
      const portIsOpen = await isPortReachable(port, {
        host: ip,
        timeout: 5000, // 5 second timeout for port check
      })

      if (!portIsOpen) {
        return {
          isConnected: false,
          portIsOpen: false,
          sshConnected: false,
          serverInfo: null,
          error: `Port ${port} is not reachable on ${ip}. Please check if the server is running and the port is open.`,
        }
      }

      let sshConnected = false
      let serverInfo = null
      let ssh

      try {
        // Attempt SSH connection
        ssh = await dynamicSSH({
          host: ip,
          port,
          privateKey,
          username,
          hostname: 'vmi2666999',
        })

        if (ssh.isConnected()) {
          sshConnected = true

          // Get server information
          const {
            dokkuVersion,
            linuxDistributionType,
            linuxDistributionVersion,
            netdataVersion,
            railpackVersion,
          } = await server.info({ ssh })

          serverInfo = {
            dokku: dokkuVersion,
            netdata: netdataVersion,
            os: {
              type: linuxDistributionType,
              version: linuxDistributionVersion,
            },
            railpack: railpackVersion,
          }
        }
      } catch (sshError) {
        console.error('SSH connection failed:', sshError)

        // Handle specific SSH errors
        if (sshError instanceof Error) {
          const errorMessage = sshError.message.toLowerCase()

          if (errorMessage.includes('authentication')) {
            return {
              isConnected: false,
              portIsOpen,
              sshConnected: false,
              serverInfo: null,
              error:
                'SSH authentication failed. Please check your username and private key.',
            }
          } else if (errorMessage.includes('timeout')) {
            return {
              isConnected: false,
              portIsOpen,
              sshConnected: false,
              serverInfo: null,
              error:
                'SSH connection timeout. The server may be slow to respond.',
            }
          } else if (errorMessage.includes('refused')) {
            return {
              isConnected: false,
              portIsOpen,
              sshConnected: false,
              serverInfo: null,
              error:
                'SSH connection refused. Please check if SSH service is running on the server.',
            }
          } else if (errorMessage.includes('host key')) {
            return {
              isConnected: false,
              portIsOpen,
              sshConnected: false,
              serverInfo: null,
              error:
                'SSH host key verification failed. The server key may have changed.',
            }
          }
        }

        return {
          isConnected: false,
          portIsOpen,
          sshConnected: false,
          serverInfo: null,
          error: 'SSH connection failed. Please check your connection details.',
        }
      } finally {
        // Clean up SSH connection
        if (ssh) {
          try {
            ssh.dispose()
          } catch (disposeError) {
            console.error('Error disposing SSH connection:', disposeError)
          }
        }
      }

      const isFullyConnected = portIsOpen && sshConnected

      return {
        isConnected: isFullyConnected,
        portIsOpen,
        sshConnected,
        serverInfo,
        error: null,
      }
    } catch (error) {
      console.error('Server connection check failed:', error)

      // Handle different types of errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase()

        if (errorMessage.includes('network') || errorMessage.includes('dns')) {
          return {
            isConnected: false,
            portIsOpen: false,
            sshConnected: false,
            serverInfo: null,
            error:
              'Network error. Please check your internet connection and server IP address.',
          }
        } else if (errorMessage.includes('timeout')) {
          return {
            isConnected: false,
            portIsOpen: false,
            sshConnected: false,
            serverInfo: null,
            error:
              'Connection timeout. The server may be unreachable or overloaded.',
          }
        }
      }

      // Generic error fallback
      return {
        isConnected: false,
        portIsOpen: false,
        sshConnected: false,
        serverInfo: null,
        error:
          'Failed to connect to server. Please check your connection details and try again.',
      }
    }
  })
