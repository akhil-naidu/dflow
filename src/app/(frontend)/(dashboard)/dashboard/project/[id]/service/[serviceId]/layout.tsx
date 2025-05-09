import { ExternalLink, Github, Globe } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React, { JSX, SVGProps, Suspense } from 'react'

import { getServiceDetails } from '@/actions/pages/service'
import SidebarToggleButton from '@/components/SidebarToggleButton'
import {
  Docker,
  MariaDB,
  MongoDB,
  MySQL,
  PostgreSQL,
  Redis,
} from '@/components/icons'
import DeploymentForm from '@/components/service/DeploymentForm'
import { ServiceLayoutSkeleton } from '@/components/skeletons/ServiceLayoutSkeleton'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Service } from '@/payload-types'
import { DisableDeploymentContextProvider } from '@/providers/DisableDeployment'

import LayoutClient from './layout.client'

type StatusType =
  | NonNullable<NonNullable<Service['databaseDetails']>['type']>
  | 'app'
  | 'docker'

const iconMapping: {
  [key in StatusType]: (props: SVGProps<SVGSVGElement>) => JSX.Element
} = {
  postgres: PostgreSQL,
  mariadb: MariaDB,
  mongo: MongoDB,
  mysql: MySQL,
  redis: Redis,
  app: props => <Github {...props} />,
  docker: Docker,
}

const SuspendedServicePageLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{
    id: string
    serviceId: string
  }>
}) => {
  const { serviceId } = await params
  const service = await getServiceDetails({ id: serviceId })

  if (!service?.data) {
    return notFound()
  }

  const { project, ...serviceDetails } = service?.data

  const Icon =
    serviceDetails.type === 'database' && serviceDetails.databaseDetails?.type
      ? iconMapping[serviceDetails.databaseDetails.type]
      : serviceDetails.type === 'database'
        ? undefined // Handle "database" type explicitly if no icon is needed
        : iconMapping[serviceDetails.type as Exclude<StatusType, 'database'>]

  const domains = serviceDetails.domains

  const services =
    typeof project === 'object' && project.services?.docs
      ? project.services?.docs?.filter(service => typeof service === 'object')
      : []

  return (
    <LayoutClient
      type={serviceDetails.type}
      services={services}
      serviceName={serviceDetails.name}>
      <div className='mb-6 md:flex md:justify-between md:gap-x-2'>
        <div>
          <div className='flex items-center gap-2'>
            {Icon ? <Icon className='size-6' /> : <Github className='size-6' />}
            <h1 className='text-2xl font-semibold'>{serviceDetails.name}</h1>

            {serviceDetails?.databaseDetails?.status && (
              <Badge className='h-max w-max gap-1' variant={'outline'}>
                {serviceDetails?.databaseDetails?.status}
              </Badge>
            )}

            <SidebarToggleButton
              directory='services'
              fileName={`${serviceDetails?.type === 'app' ? 'app-service' : serviceDetails?.type === 'database' ? 'database-service' : serviceDetails?.type === 'docker' ? 'docker-service' : ''}`}
            />
          </div>

          <p
            className='line-clamp-1 text-muted-foreground'
            title={serviceDetails.description || undefined}>
            {serviceDetails.description}
          </p>

          <div className='flex items-center gap-2 text-muted-foreground'>
            {domains?.length ? (
              <>
                <Globe size={16} />
                <Link href={`//${domains[0].domain}`} target='_blank'>
                  <div className='flex items-center gap-x-1 text-sm hover:text-primary'>
                    {domains[0].domain}
                    <ExternalLink size={14} />
                  </div>
                </Link>
              </>
            ) : null}

            {domains?.length && domains.length > 1 ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>+ {(domains?.length ?? 0) - 1}</div>
                  </TooltipTrigger>

                  <TooltipContent side='top'>
                    {domains?.slice(1).map((domain, index) => (
                      <div
                        key={index}
                        className='flex items-center gap-x-1 text-sm hover:text-primary'>
                        <Link href={`//${domain.domain}`} target='_blank'>
                          {domain.domain}
                        </Link>
                        <ExternalLink size={14} />
                      </div>
                    ))}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
        </div>

        <DeploymentForm service={{ project, ...serviceDetails }} />
      </div>

      {children}
    </LayoutClient>
  )
}

const ServiceIdLayout = ({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{
    id: string
    serviceId: string
  }>
}) => {
  return (
    <DisableDeploymentContextProvider>
      <Suspense fallback={<ServiceLayoutSkeleton />}>
        <SuspendedServicePageLayout params={params}>
          {children}
        </SuspendedServicePageLayout>
      </Suspense>
    </DisableDeploymentContextProvider>
  )
}

export default ServiceIdLayout
