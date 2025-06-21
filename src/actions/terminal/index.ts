'use server'

import { revalidatePath } from 'next/cache'

import { protectedClient } from '@/lib/safe-action'
import { addRestartAppQueue } from '@/queues/app/restart'
import { addStartAppQueue } from '@/queues/app/start'
import { addStopAppQueue } from '@/queues/app/stop'

// import { addInstallTerminalQueue } from '@/queues/terminal/install'
// import { addUninstallTerminalQueue } from '@/queues/terminal/uninstall'

import {
  installTerminalSchema,
  restartTerminalSchema,
  startTerminalSchema,
  stopTerminalSchema,
  uninstallTerminalSchema,
} from './validator'

const TERMINAL_APP_NAME = 'wetty-terminal'

export const installTerminalAction = protectedClient
  .metadata({
    actionName: 'installTerminalAction',
  })
  .schema(installTerminalSchema)
  .action(async ({ clientInput, ctx }) => {
    const { serverId } = clientInput
    const { payload } = ctx

    // Fetch server details from the database
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

    // Set up SSH connection details
    const sshDetails = {
      host: ip,
      port,
      username,
      privateKey: sshKey.privateKey,
      hostname,
    }

    // Add the job to the queue instead of executing directly
    // await addInstallTerminalQueue({
    //   sshDetails,
    //   serverDetails: {
    //     id: serverId,
    //   },
    //   terminalDetails: {
    //     name: TERMINAL_APP_NAME,
    //     image: 'wettyoss/wetty:latest',
    //     port: 3000, // Port for the wetty terminal
    //   },
    // })

    // Refresh the server details page
    revalidatePath(`/servers/${serverId}`)

    return {
      success: true,
      message:
        'Terminal installation started. You can monitor progress in the server logs.',
    }
  })

export const uninstallTerminalAction = protectedClient
  .metadata({
    actionName: 'uninstallTerminalAction',
  })
  .schema(uninstallTerminalSchema)
  .action(async ({ clientInput, ctx }) => {
    const { serverId } = clientInput
    const { payload } = ctx

    const serverDetails = await payload.findByID({
      collection: 'servers',
      id: serverId,
      depth: 10,
    })

    if (typeof serverDetails.sshKey !== 'object') {
      throw new Error('SSH key not found')
    }

    // const uninstallResponse = await addUninstallTerminalQueue({
    //   serverDetails: {
    //     id: serverId,
    //   },
    //   sshDetails: {
    //     host: serverDetails.ip,
    //     port: serverDetails.port,
    //     privateKey: serverDetails.sshKey.privateKey,
    //     username: serverDetails.username,
    //   },
    //   terminalDetails: {
    //     name: TERMINAL_APP_NAME,
    //   },
    // })

    // if (uninstallResponse.id) {
    //   revalidatePath(`/servers/${serverId}`)
    //   return { success: true, message: 'Terminal uninstallation started' }
    // }

    return {
      success: false,
      message: 'Failed to queue terminal uninstallation',
    }
  })

export const startTerminalAction = protectedClient
  .metadata({
    actionName: 'startTerminalAction',
  })
  .schema(startTerminalSchema)
  .action(async ({ clientInput, ctx }) => {
    const { serverId } = clientInput
    const { payload } = ctx

    const serverDetails = await payload.findByID({
      collection: 'servers',
      id: serverId,
      depth: 10,
    })

    if (typeof serverDetails.sshKey !== 'object') {
      throw new Error('SSH key not found')
    }

    const startResponse = await addStartAppQueue({
      serverDetails: {
        id: serverId,
      },
      sshDetails: {
        host: serverDetails.ip,
        port: serverDetails.port,
        privateKey: serverDetails.sshKey.privateKey,
        username: serverDetails.username,
      },
      serviceDetails: {
        id: `terminal-${serverId}`,
        name: TERMINAL_APP_NAME,
      },
    })

    if (startResponse.id) {
      revalidatePath(`/servers/${serverId}`)
      return { success: true, message: 'Terminal start initiated' }
    }

    return { success: false, message: 'Failed to queue terminal start' }
  })

export const stopTerminalAction = protectedClient
  .metadata({
    actionName: 'stopTerminalAction',
  })
  .schema(stopTerminalSchema)
  .action(async ({ clientInput, ctx }) => {
    const { serverId } = clientInput
    const { payload } = ctx

    const serverDetails = await payload.findByID({
      collection: 'servers',
      id: serverId,
      depth: 10,
    })

    if (typeof serverDetails.sshKey !== 'object') {
      throw new Error('SSH key not found')
    }

    const stopResponse = await addStopAppQueue({
      serverDetails: {
        id: serverId,
      },
      sshDetails: {
        host: serverDetails.ip,
        port: serverDetails.port,
        privateKey: serverDetails.sshKey.privateKey,
        username: serverDetails.username,
      },
      serviceDetails: {
        id: `terminal-${serverId}`,
        name: TERMINAL_APP_NAME,
      },
    })

    if (stopResponse.id) {
      revalidatePath(`/servers/${serverId}`)
      return { success: true, message: 'Terminal stop initiated' }
    }

    return { success: false, message: 'Failed to queue terminal stop' }
  })

export const restartTerminalAction = protectedClient
  .metadata({
    actionName: 'restartTerminalAction',
  })
  .schema(restartTerminalSchema)
  .action(async ({ clientInput, ctx }) => {
    const { serverId } = clientInput
    const { payload } = ctx

    const serverDetails = await payload.findByID({
      collection: 'servers',
      id: serverId,
      depth: 10,
    })

    if (typeof serverDetails.sshKey !== 'object') {
      throw new Error('SSH key not found')
    }

    const restartResponse = await addRestartAppQueue({
      serverDetails: {
        id: serverId,
      },
      sshDetails: {
        host: serverDetails.ip,
        port: serverDetails.port,
        privateKey: serverDetails.sshKey.privateKey,
        username: serverDetails.username,
      },
      serviceDetails: {
        id: `terminal-${serverId}`,
        name: TERMINAL_APP_NAME,
      },
    })

    if (restartResponse.id) {
      revalidatePath(`/servers/${serverId}`)
      return { success: true, message: 'Terminal restart initiated' }
    }

    return { success: false, message: 'Failed to queue terminal restart' }
  })
