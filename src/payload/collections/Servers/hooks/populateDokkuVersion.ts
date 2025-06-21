import { CollectionAfterReadHook } from 'payload'

import { server } from '@/lib/server'
import { dynamicSSH } from '@/lib/ssh'
import { Server } from '@/payload-types'

const extractValue = ({ key, data }: { key: string; data: string }) => {
  const match = data.match(new RegExp(`${key}:\\t(.+)`))
  return match ? match[1] : null
}

export const populateDokkuVersion: CollectionAfterReadHook<Server> = async ({
  doc,
  context,
  req,
}) => {
  const { payload } = req

  // Sending a variable for populating server details
  if (!context.populateServerDetails) {
    return doc
  }

  const sshKey = typeof doc.sshKey === 'object' ? doc.sshKey : undefined
  // const portIsOpen = await isPortReachable(doc.port, { host: doc.ip })
  const portIsOpen = true

  let dokku: string | undefined
  let netdata: string | undefined
  let sshConnected = false
  let linuxVersion
  let linuxType
  let railpack: string | undefined

  if (sshKey && sshKey?.privateKey) {
    if (portIsOpen) {
      try {
        const ssh = await dynamicSSH({
          host: doc.ip,
          port: doc.port,
          privateKey: sshKey.privateKey,
          username: doc.username,
          hostname: doc.hostname,
        })

        if (ssh.isConnected()) {
          sshConnected = true
        }

        const {
          dokkuVersion,
          linuxDistributionType,
          linuxDistributionVersion,
          netdataVersion,
          railpackVersion,
        } = await server.info({ ssh })

        dokku = dokkuVersion
        netdata = netdataVersion
        linuxVersion = linuxDistributionVersion
        linuxType = linuxDistributionType
        railpack = railpackVersion

        ssh.dispose()
      } catch (error) {
        console.log({ error })
      }
    }
  }

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
    console.log({ error })
  }

  return {
    ...doc,
    version: dokku, // version of dokku
    netdataVersion: netdata,
    portIsOpen, // boolean indicating whether the server is running
    sshConnected, // boolean indicating whether ssh is connected
    os: {
      type: linuxType,
      version: linuxVersion,
    },
    railpack,
  }
}
