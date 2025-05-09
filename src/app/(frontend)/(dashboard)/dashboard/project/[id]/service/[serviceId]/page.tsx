import { notFound, redirect } from 'next/navigation'
import type { SearchParams } from 'nuqs/server'
import { Suspense } from 'react'

import { getServiceDeploymentsBackups } from '@/actions/pages/service'
import Backup from '@/components/service/Backup'
import DeploymentList from '@/components/service/DeploymentList'
import DomainList from '@/components/service/DomainList'
import GeneralTab from '@/components/service/GeneralTab'
import LogsTabClient from '@/components/service/LogsTabClient'
import VariablesForm from '@/components/service/VariablesForm'
import { ServiceSkeleton } from '@/components/skeletons/ServiceSkeleton'
import { loadServicePageTabs } from '@/lib/searchParams'

interface PageProps {
  params: Promise<{
    id: string
    serviceId: string
  }>
  searchParams: Promise<SearchParams>
}

const SuspendedPage = async ({ params, searchParams }: PageProps) => {
  const { serviceId } = await params
  const { tab } = await loadServicePageTabs(searchParams)
  const serviceDetails = await getServiceDeploymentsBackups({ id: serviceId })

  if (!serviceDetails?.data?.service) {
    notFound()
  }

  const { service, deployments, backupsDocs } = serviceDetails.data

  const server =
    typeof service.project === 'object' ? service.project.server : ''
  const serverObject = typeof server === 'object' ? server : null

  if (
    serverObject &&
    serverObject.connection &&
    serverObject.connection.status !== 'success'
  ) {
    const projectId =
      typeof service.project === 'object' ? service.project.id : service.project

    redirect(`/dashboard/project/${projectId}`)
  }

  const domains = service.domains ?? []
  const databaseDetails = service.databaseDetails ?? {}

  switch (tab) {
    case 'general':
      return <GeneralTab service={service} />

    case 'environment':
      return <VariablesForm service={service} />

    case 'deployments':
      return (
        <DeploymentList
          deployments={deployments}
          serviceId={service.id}
          serverId={typeof server === 'object' ? server.id : server}
        />
      )

    case 'domains':
      return <DomainList domains={domains} />

    case 'logs':
      return (
        <LogsTabClient
          serviceId={service.id}
          serverId={typeof server === 'object' ? server.id : server}
        />
      )
    case 'backup':
      return (
        <Backup
          databaseDetails={databaseDetails}
          serviceId={serviceId}
          backups={backupsDocs}
        />
      )

    default:
      return <GeneralTab service={service} />
  }
}

const ServiceIdPage = async (props: PageProps) => {
  return (
    <Suspense fallback={<ServiceSkeleton />}>
      <SuspendedPage {...props} />
    </Suspense>
  )
}

export default ServiceIdPage
