import TabsLayout from '../../../layout.client'
import configPromise from '@payload-config'
import { ScreenShareOff } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { Suspense, use } from 'react'

import SidebarToggleButton from '@/components/SidebarToggleButton'
import CreateService from '@/components/service/CreateService'
import ServiceList from '@/components/service/ServiceList'
import ServicesArchitecture from '@/components/service/ServicesArchitecture'
import ServicesSkeleton from '@/components/skeletons/ServicesSkeleton'
import DeployTemplate from '@/components/templates/DeployTemplate'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ArchitectureContextProvider } from '@/providers/ArchitectureProvider'

interface PageProps {
  params: Promise<{
    id: string
    organisation: string
  }>
}

const SuspendedPage = ({ params }: PageProps) => {
  const { id, organisation } = use(params)
  const payload = use(getPayload({ config: configPromise }))

  const [{ docs: services }, { docs: Projects }] = use(
    Promise.all([
      payload.find({
        collection: 'services',
        where: {
          and: [
            {
              project: {
                equals: id,
              },
            },
            {
              'tenant.slug': {
                equals: organisation,
              },
            },
          ],
        },
        joins: {
          deployments: {
            limit: 1,
          },
        },
        depth: 10,
      }),
      payload.find({
        collection: 'projects',
        where: {
          'tenant.slug': {
            equals: organisation,
          },
        },
        select: {
          name: true,
          description: true,
          server: true,
        },
      }),
    ]),
  )

  const project = Projects.at(0)
  if (!project) {
    notFound()
  }

  // Check if server is connected
  const isServerConnected = Boolean(
    project.server &&
      typeof project.server === 'object' &&
      project.server.connection?.status === 'success',
  )

  return (
    <ArchitectureContextProvider>
      <section>
        <div className='flex w-full justify-between'>
          <div>
            <h2 className='flex items-center text-2xl font-semibold'>
              {project.name}
              <SidebarToggleButton
                directory='services'
                fileName='services-overview'
              />
            </h2>
            <p className='text-sm text-muted-foreground'>
              {project.description}
            </p>
          </div>

          {typeof project.server === 'object' && (
            <div className='flex items-center gap-3'>
              <DeployTemplate
                disableDeployButton={!isServerConnected}
                disableReason={
                  'Cannot deploy template: Server is not connected'
                }
              />

              {services?.length ? (
                <CreateService
                  server={project.server}
                  project={project}
                  disableCreateButton={!isServerConnected}
                  disableReason={
                    'Cannot create service: Server is not connected'
                  }
                />
              ) : null}
            </div>
          )}
        </div>

        {/* Display SSH connection alert if server is not connected */}
        {typeof project.server === 'object' && !isServerConnected && (
          <Alert variant='destructive' className='mb-4 mt-4'>
            <ScreenShareOff className='h-4 w-4' />
            <AlertTitle>SSH Connection Failed</AlertTitle>
            <AlertDescription>
              Unable to establish SSH connection to the server. Please verify
              your server credentials and SSH key configuration. Server
              operations, including service creation and deployment, are
              unavailable until the connection is restored.{' '}
              <Link
                href={`/servers/${project.server.id}`}
                className='text-sm font-normal text-primary hover:text-primary hover:underline hover:underline-offset-4'>
                Go to server settings
              </Link>
            </AlertDescription>
          </Alert>
        )}

      {services.length ? (
        <ServiceList
          organisationSlug={organisation}
          projectId={id}
          services={services}
        />
      ) : (
        <ServicesArchitecture />
      )}
    </section>
  )
}

const ProjectIdPage = async ({ params }: PageProps) => {
  return (
    <TabsLayout>
      <Suspense fallback={<ServicesSkeleton />}>
        <SuspendedPage params={params} />
      </Suspense>
    </TabsLayout>
  )
}

export default ProjectIdPage
