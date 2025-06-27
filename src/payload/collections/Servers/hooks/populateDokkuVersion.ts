import isPortReachable from 'is-port-reachable'
import { NodeSSH } from 'node-ssh'
import { CollectionAfterReadHook } from 'payload'

import { server } from '@/lib/server'
import { dynamicSSH, extractSSHDetails } from '@/lib/ssh'
import { Server } from '@/payload-types'

export const populateDokkuVersion: CollectionAfterReadHook<Server> = async ({
  doc,
  context,
  req,
}) => {
  const { payload } = req

  // Step 1: Check if we should populate server details
  // If context flag is false, return the document as-is without any processing
  if (!context.populateServerDetails) {
    return doc
  }

  const sshDetails = extractSSHDetails({ server: doc })

  // Step 2: Extract connection parameters from the server document
  // Get SSH key object, connection type, port, username, and host details
  const sshKey = typeof doc.sshKey === 'object' ? doc.sshKey : undefined
  const isTailscale = doc.preferConnectionType === 'tailscale'
  const port = doc.port ?? 22
  const username = doc.username ?? 'root'
  const host = isTailscale ? (doc.hostname ?? '') : (doc.ip ?? '')

  // Step 3: Handle case where no host is available
  // Return default values indicating failed connection attempts
  if (!host) {
    return {
      ...doc,
      version: undefined,
      netdataVersion: undefined,
      portIsOpen: false,
      sshConnected: false,
      os: {
        type: undefined,
        version: undefined,
      },
      railpack: undefined,
    }
  }

  // Step 4: Check if the port is reachable
  // For Tailscale connections, assume port is open; for regular connections, test port connectivity
  const portIsOpen = isTailscale ? true : await isPortReachable(port, { host })

  // Step 5: Initialize variables to store server information
  let dokku: string | undefined | null
  let netdata: string | undefined | null
  let sshConnected = false
  let linuxVersion: string | undefined | null
  let linuxType: string | undefined | null
  let railpack: string | undefined | null

  // Step 6: Determine if we can attempt SSH connection
  // Need either Tailscale connection OR (SSH private key AND open port)
  const canAttemptConnection = isTailscale || (sshKey?.privateKey && portIsOpen)

  // Step 7: Attempt SSH connection and gather server information
  if (canAttemptConnection) {
    let ssh: NodeSSH | null = null
    try {
      ssh = await dynamicSSH(sshDetails)
      // Step 7c: If connected successfully, gather server information
      if (ssh.isConnected()) {
        sshConnected = true

        // Get comprehensive server information (versions, OS details, etc.)
        const serverInfo = await server.info({ ssh })

        // Store server information directly without null conversion
        dokku = serverInfo.dokkuVersion
        netdata = serverInfo.netdataVersion
        linuxVersion = serverInfo.linuxDistributionVersion
        linuxType = serverInfo.linuxDistributionType
        railpack = serverInfo.railpackVersion
      }
    } catch (error) {
      // Step 7e: Handle connection errors gracefully
      console.log(`Connection error for ${doc.name}:`, error)
    } finally {
      ssh?.dispose()
    }
  }

  // Step 8: Update the server document with connection status
  // Store whether the connection was successful and when it was last checked
  try {
    await payload.update({
      collection: 'servers',
      id: doc.id,
      data: {
        connection: {
          status: sshConnected ? 'success' : 'failed',
          lastChecked: new Date().toString(),
        },
      },
    })
  } catch (error) {
    console.log('Error updating server connection status:', error)
  }

  // Step 9: Return the enriched server document
  // Include all gathered information: versions, connection status, OS details
  return {
    ...doc,
    version: dokku,
    netdataVersion: netdata,
    portIsOpen,
    sshConnected,
    os: {
      type: linuxType,
      version: linuxVersion,
    },
    railpack,
  }
}
