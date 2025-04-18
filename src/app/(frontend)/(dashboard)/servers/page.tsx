import LayoutClient from '../layout.client'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { Suspense, use } from 'react'

import ServerTerminal from '@/components/ServerTerminal'
import CreateServer from '@/components/servers/CreateServerForm'
import ServerCard from '@/components/servers/ServerCard'
import {
  CreateServerButtonSkeleton,
  ServersSkeleton,
} from '@/components/skeletons/ServersSkeleton'

const SuspendedAddServer = () => {
  const payload = use(getPayload({ config: configPromise }))

  const [sshKeysRes, securityGroupsRes] = use(
    Promise.all([
      payload.find({ collection: 'sshKeys', pagination: false }),
      payload.find({ collection: 'securityGroups', pagination: false }),
    ]),
  )

  return (
    <CreateServer
      sshKeys={sshKeysRes.docs}
      securityGroups={securityGroupsRes.docs}
    />
  )
}

const SuspendedServers = () => {
  const payload = use(getPayload({ config: configPromise }))

  const { docs: servers } = use(
    payload.find({ collection: 'servers', pagination: false }),
  )

  return (
    <>
      {servers.length ? (
        <div className='grid gap-4 md:grid-cols-3'>
          {servers.map(server => (
            <ServerCard server={server} key={server.id} />
          ))}
        </div>
      ) : (
        <p className='text-center'>No Servers Added!</p>
      )}

      <ServerTerminal servers={servers} />
    </>
  )
}

const ServersPage = async () => {
  return (
    <LayoutClient>
      <div className='mb-5 flex items-center justify-between'>
        <div className='text-2xl font-semibold'>Servers</div>
        <Suspense fallback={<CreateServerButtonSkeleton />}>
          <SuspendedAddServer />
        </Suspense>
      </div>
      <Suspense fallback={<ServersSkeleton />}>
        <SuspendedServers />
      </Suspense>
    </LayoutClient>
  )
}

export default ServersPage
