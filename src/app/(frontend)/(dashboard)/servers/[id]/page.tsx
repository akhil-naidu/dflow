import configPromise from '@payload-config'
import { ScreenShareOff, TriangleAlert } from 'lucide-react'
import { notFound } from 'next/navigation'
import type { SearchParams } from 'nuqs/server'
import { getPayload } from 'payload'
import { Suspense, use } from 'react'

import UpdateServerForm from '@/components/servers/AttachCustomServerForm'
import UpdateEC2InstanceForm from '@/components/servers/CreateEC2InstanceForm'
import DomainList from '@/components/servers/DomainList'
import PluginsList from '@/components/servers/PluginsList'
import { ProjectsAndServicesSection } from '@/components/servers/ProjectsAndServices'
import RetryPrompt from '@/components/servers/RetryPrompt'
import ServerDetails from '@/components/servers/ServerDetails'
import Monitoring from '@/components/servers/monitoring/Monitoring'
import NetdataInstallPrompt from '@/components/servers/monitoring/NetdataInstallPrompt'
import ServerOnboarding from '@/components/servers/onboarding/ServerOnboarding'
import {
  DomainsTabSkeleton,
  GeneralTabSkeleton,
  MonitoringTabSkeleton,
  PluginsTabSkeleton,
} from '@/components/skeletons/ServerSkeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { supportedLinuxVersions } from '@/lib/constants'
import { netdata } from '@/lib/netdata'
import { loadServerPageTabs } from '@/lib/searchParams'
import { ServerType } from '@/payload-types-overrides'

import LayoutClient from './layout.client'

interface PageProps {
  params: Promise<{
    id: string
    organisation: string
  }>
  searchParams: Promise<SearchParams>
}

const SSHConnectionAlert = ({ server }: { server: ServerType }) => {
  if (server.connection?.status === 'success') return null

  return (
    <Alert variant='destructive'>
      <ScreenShareOff className='h-4 w-4' />
      <AlertTitle>SSH connection failed</AlertTitle>
      <AlertDescription>
        Failed to establish connection to server, please check the server
        details
      </AlertDescription>
    </Alert>
  )
}

const GeneralTab = ({ server }: { server: ServerType }) => {
  const [{ docs: sshKeys }, { docs: projects }, { docs: securityGroups }] = use(
    Promise.all([
      getPayload({ config: configPromise }).then(payload =>
        payload.find({ collection: 'sshKeys', pagination: false }),
      ),
      getPayload({ config: configPromise }).then(payload =>
        payload.find({
          collection: 'projects',
          where: { server: { equals: server.id } },
        }),
      ),
      getPayload({ config: configPromise }).then(payload =>
        payload.find({
          collection: 'securityGroups',
          pagination: false,
          where: {
            and: [
              {
                or: [
                  { cloudProvider: { equals: server.provider } },
                  { cloudProvider: { exists: false } },
                ],
              },
              {
                or: [
                  {
                    cloudProviderAccount: {
                      equals: server.cloudProviderAccount,
                    },
                  },
                  { cloudProviderAccount: { exists: false } },
                ],
              },
            ],
          },
        }),
      ),
    ]),
  )

  const serverDetails = server.netdataVersion
    ? use(netdata.metrics.getServerDetails({ host: server.ip }))
    : {}

  const renderUpdateForm = () => {
    switch (server.provider) {
      case 'aws':
        return (
          <UpdateEC2InstanceForm
            sshKeys={sshKeys}
            server={server}
            securityGroups={securityGroups}
            formType='update'
          />
        )

      default:
        return (
          <UpdateServerForm
            server={server}
            sshKeys={sshKeys}
            formType='update'
          />
        )
    }
  }

  return (
    <div className='flex flex-col space-y-5'>
      <SSHConnectionAlert server={server} />
      <ServerDetails serverDetails={serverDetails} server={server} />

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='md:col-span-2'>
          <div className='space-y-4 rounded bg-muted/30 p-4'>
            {renderUpdateForm()}
          </div>
        </div>

        <ProjectsAndServicesSection projects={projects} />
      </div>
    </div>
  )
}

const MonitoringTab = ({
  server,
  isSshConnected,
}: {
  server: ServerType
  isSshConnected: boolean
}) => {
  if (
    !server ||
    typeof server !== 'object' ||
    typeof server.sshKey !== 'object'
  ) {
    return <RetryPrompt />
  }

  return (
    <>
      <SSHConnectionAlert server={server} />
      <div className='mt-2'>
        {!server.netdataVersion ? (
          <NetdataInstallPrompt
            server={server}
            disableInstallButton={!isSshConnected}
          />
        ) : (
          <Monitoring server={server} />
        )}
      </div>
    </>
  )
}

const PluginsTab = ({ server }: { server: ServerType }) => {
  const dokkuInstalled =
    server.connection?.status === 'success' &&
    supportedLinuxVersions.includes(server.os.version ?? '') &&
    server.version

  return (
    <div className='mt-2'>
      <SSHConnectionAlert server={server} />
      {dokkuInstalled ? (
        <PluginsList server={server} />
      ) : (
        <Alert variant='info'>
          <TriangleAlert className='h-4 w-4' />
          <AlertTitle>Dokku not found!</AlertTitle>
          <AlertDescription className='flex w-full flex-col justify-between gap-2 md:flex-row'>
            <p>
              Either dokku is not installed on your server, or your OS
              doesn&apos;t support it. Refer to{' '}
              <a
                className='underline'
                href='https://dokku.com/docs/getting-started/installation/'>
                the docs
              </a>
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

const DomainsTab = ({ server }: { server: ServerType }) => {
  return (
    <>
      <SSHConnectionAlert server={server} />
      <div className='mt-2'>
        <DomainList server={server} />
      </div>
    </>
  )
}

const SuspendedPage = ({ params, searchParams }: PageProps) => {
  const { id, organisation } = use(params)
  const { tab } = use(loadServerPageTabs(searchParams))

  const payload = use(getPayload({ config: configPromise }))
  const [servers, server] = use(
    Promise.all([
      payload.find({
        collection: 'servers',
        where: {
          'tenant.slug': {
            equals: organisation,
          },
        },
        pagination: false,
      }),
      payload.findByID({
        collection: 'servers',
        id,
        context: { populateServerDetails: true },
      }) as Promise<ServerType>,
    ]),
  )

  if (!server?.id) return notFound()

  const renderTab = () => {
    switch (tab) {
      case 'general':
        return (
          <Suspense fallback={<GeneralTabSkeleton />}>
            <GeneralTab server={server} />
          </Suspense>
        )

      case 'plugins':
        return (
          <Suspense fallback={<PluginsTabSkeleton />}>
            <PluginsTab server={server} />
          </Suspense>
        )

      case 'domains':
        return (
          <Suspense fallback={<DomainsTabSkeleton />}>
            <DomainsTab server={server} />
          </Suspense>
        )

      case 'monitoring':
        return (
          <Suspense fallback={<MonitoringTabSkeleton />}>
            <MonitoringTab
              server={server}
              isSshConnected={server.connection?.status === 'success'}
            />
          </Suspense>
        )

      default:
        return (
          <Suspense fallback={<GeneralTabSkeleton />}>
            <GeneralTab server={server} />
          </Suspense>
        )
    }
  }

  return (
    <LayoutClient server={server} servers={servers.docs}>
      {server.onboarded ? renderTab() : <ServerOnboarding server={server} />}
    </LayoutClient>
  )
}

const ServerIdPage = (props: PageProps) => {
  return <SuspendedPage {...props} />
}

export default ServerIdPage
