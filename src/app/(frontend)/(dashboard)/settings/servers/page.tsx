import configPromise from '@payload-config'
import { Plus } from 'lucide-react'
import { getPayload } from 'payload'
import { Suspense } from 'react'

import Loader from '@/components/Loader'
import CreateServer from '@/components/servers/CreateServerForm'
import ServerList from '@/components/servers/ServerList'
import { Button } from '@/components/ui/button'
import { ServerType } from '@/payload-types-overrides'

const SuspendedPage = async () => {
  const payload = await getPayload({ config: configPromise })
  const { docs: keys } = await payload.find({
    collection: 'sshKeys',
    limit: 1000,
  })

  const { docs: servers } = await payload.find({
    collection: 'servers',
    limit: 1000,
    depth: 5,
  })

  return (
    <section className='space-y-8'>
      <CreateServer sshKeys={keys}>
        <Button>
          <Plus />
          Add Server
        </Button>
      </CreateServer>
      <ServerList servers={servers as ServerType[]} sshKeys={keys} />
    </section>
  )
}

const ServersPage = () => {
  return (
    <Suspense fallback={<Loader className='h-96 w-full' />}>
      <SuspendedPage />
    </Suspense>
  )
}

export default ServersPage
