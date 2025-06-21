'use server'

import { revalidatePath } from 'next/cache'
import { NodeSSH } from 'node-ssh'

import { dokku } from '@/lib/dokku'
import { protectedClient } from '@/lib/safe-action'
import { dynamicSSH } from '@/lib/ssh'
import { addLetsencryptPluginConfigureQueue } from '@/queues/letsencrypt/configure'
import { addDeletePluginQueue } from '@/queues/plugin/delete'
import { addInstallPluginQueue } from '@/queues/plugin/install'
import { addTogglePluginQueue } from '@/queues/plugin/toggle'

import {
  configureLetsencryptPluginSchema,
  installPluginSchema,
  syncPluginSchema,
  togglePluginStatusSchema,
} from './validator'

export const installPluginAction = protectedClient
  .metadata({
    actionName: 'installPluginAction',
  })
  .schema(installPluginSchema)
  .action(async ({ clientInput, ctx }) => {
    const { payload, userTenant } = ctx
    const { serverId, pluginName, pluginURL } = clientInput

    // Fetching server details instead of passing from client
    const {
      id,
      ip,
      username,
      port,
      sshKey,
      hostname,
      plugins: previousPlugins,
    } = await payload.findByID({
      collection: 'servers',
      id: serverId,
      depth: 5,
    })

    if (!id) {
      throw new Error('Server not found')
    }

    if (typeof sshKey !== 'object') {
      throw new Error('SSH key not found')
    }

    const sshDetails = {
      host: ip,
      port,
      username,
      privateKey: sshKey.privateKey,
      hostname,
    }

    const queueResponse = await addInstallPluginQueue({
      pluginDetails: {
        name: pluginName,
        url: pluginURL,
      },
      serverDetails: {
        id: serverId,
        previousPlugins,
      },
      sshDetails,
      tenant: {
        slug: userTenant.tenant.slug,
      },
    })

    if (queueResponse.id) {
      return { success: true }
    }
  })

export const syncPluginAction = protectedClient
  .metadata({
    actionName: 'syncPluginAction',
  })
  .schema(syncPluginSchema)
  .action(async ({ clientInput, ctx }) => {
    const { payload } = ctx
    const { serverId } = clientInput

    // Fetching server details instead of passing from client
    const {
      id,
      ip,
      username,
      port,
      sshKey,
      hostname,
      plugins: previousPlugins,
    } = await payload.findByID({
      collection: 'servers',
      id: serverId,
      depth: 5,
    })

    if (!id) {
      throw new Error('Server not found')
    }

    if (typeof sshKey !== 'object') {
      throw new Error('SSH key not found')
    }

    const sshDetails = {
      host: ip,
      port,
      username,
      privateKey: sshKey.privateKey,
      hostname,
    }

    let ssh: NodeSSH | null = null

    try {
      ssh = await dynamicSSH(sshDetails)

      const pluginsResponse = await dokku.plugin.list(ssh)

      const filteredPlugins = pluginsResponse.plugins.map(plugin => {
        const previousPluginDetails = (previousPlugins ?? []).find(
          previousPlugin => previousPlugin?.name === plugin?.name,
        )

        return {
          name: plugin.name,
          status: plugin.status ? ('enabled' as const) : ('disabled' as const),
          version: plugin.version,
          configuration:
            previousPluginDetails?.configuration &&
            typeof previousPluginDetails?.configuration === 'object' &&
            !Array.isArray(previousPluginDetails?.configuration)
              ? previousPluginDetails.configuration
              : {},
        }
      })

      // Updating plugin list in database
      const updatedServerResponse = await payload.update({
        collection: 'servers',
        id: serverId,
        data: {
          plugins: filteredPlugins,
        },
      })

      revalidatePath(`/servers/${serverId}/general`)
      revalidatePath(`/onboarding/dokku-install`)
      return { success: true, plugins: updatedServerResponse.plugins ?? [] }
    } catch (error) {
      let message = ''
      if (error instanceof Error) {
        message = error.message
      }

      throw new Error(`Failed to sync plugins: ${message}`)
    } finally {
      if (ssh) {
        ssh.dispose()
      }
    }
  })

export const togglePluginStatusAction = protectedClient
  .metadata({
    actionName: 'togglePluginStatusAction',
  })
  .schema(togglePluginStatusSchema)
  .action(async ({ clientInput, ctx }) => {
    const { payload, userTenant } = ctx
    const { pluginName, serverId, enabled } = clientInput

    // Fetching server details instead of passing from client
    const {
      id,
      ip,
      username,
      port,
      sshKey,
      hostname,
      plugins: previousPlugins,
    } = await payload.findByID({
      collection: 'servers',
      id: serverId,
      depth: 5,
    })

    if (!id) {
      throw new Error('Server not found')
    }

    if (typeof sshKey !== 'object') {
      throw new Error('SSH key not found')
    }

    const sshDetails = {
      host: ip,
      port,
      username,
      privateKey: sshKey.privateKey,
      hostname,
    }

    const queueResponse = await addTogglePluginQueue({
      sshDetails,
      pluginDetails: {
        enabled,
        name: pluginName,
      },
      serverDetails: {
        id: serverId,
        previousPlugins,
      },
      tenant: {
        slug: userTenant.tenant.slug,
      },
    })

    if (queueResponse.id) {
      return { success: true }
    }
  })

export const deletePluginAction = protectedClient
  .metadata({
    actionName: 'uninstallPluginAction',
  })
  .schema(installPluginSchema)
  .action(async ({ clientInput, ctx }) => {
    const { payload, userTenant } = ctx
    const { serverId, pluginName } = clientInput

    // Fetching server details instead of passing from client
    const {
      id,
      ip,
      username,
      port,
      sshKey,
      hostname,
      plugins: previousPlugins,
    } = await payload.findByID({
      collection: 'servers',
      id: serverId,
      depth: 5,
    })

    if (!id) {
      throw new Error('Server not found')
    }

    if (typeof sshKey !== 'object') {
      throw new Error('SSH key not found')
    }

    const sshDetails = {
      host: ip,
      port,
      username,
      privateKey: sshKey.privateKey,
      hostname,
    }

    const queueResponse = await addDeletePluginQueue({
      pluginDetails: {
        name: pluginName,
      },
      serverDetails: {
        id: serverId,
        previousPlugins,
      },
      sshDetails,
      tenant: {
        slug: userTenant.tenant.slug,
      },
    })

    console.log({ queueResponse })

    return { success: true }
  })

export const configureLetsencryptPluginAction = protectedClient
  .metadata({
    actionName: 'configureLetsencryptPluginAction',
  })
  .schema(configureLetsencryptPluginSchema)
  .action(async ({ clientInput, ctx }) => {
    const { payload, userTenant } = ctx
    const { email, autoGenerateSSL = false, serverId } = clientInput

    // Fetching server details instead of passing from client
    const { id, ip, username, port, sshKey, hostname } = await payload.findByID(
      {
        collection: 'servers',
        id: serverId,
        depth: 5,
      },
    )

    if (!id) {
      throw new Error('Server not found')
    }

    if (typeof sshKey !== 'object') {
      throw new Error('SSH key not found')
    }

    const sshDetails = {
      host: ip,
      port,
      username,
      privateKey: sshKey.privateKey,
      hostname,
    }

    const queueResponse = await addLetsencryptPluginConfigureQueue({
      serverDetails: {
        id: serverId,
      },
      pluginDetails: {
        autoGenerateSSL,
        email,
      },
      sshDetails,
      tenant: {
        slug: userTenant.tenant.slug,
      },
    })

    if (queueResponse.id) {
      return { success: true }
    }
  })
