import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { DynamicBreadcrumbs } from '@/components/DynamicBreadcrumbs'
import CreateService from '@/components/service/CreateService'
import { ServiceCard } from '@/components/service/ServiceCard'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

const ProjectIdPage = async ({ params }: PageProps) => {
  const { id } = await params
  const payload = await getPayload({ config: configPromise })

  const { services, ...projectDetails } = await payload.findByID({
    collection: 'projects',
    id,
  })

  if (!projectDetails) {
    notFound()
  }

  return (
    <>
      <DynamicBreadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects' },
          { label: projectDetails.name },
        ]}
      />

      <section>
        <div className='flex w-full justify-between'>
          <div>
            <h2 className='text-xl font-semibold'>{projectDetails.name}</h2>
            <p className='text-muted-foreground'>
              {projectDetails.description}
            </p>
          </div>

          <CreateService />
        </div>

        {services?.docs && services.docs.length ? (
          <div className='mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {services.docs.map((service, index) => {
              if (typeof service === 'object') {
                return (
                  <ServiceCard
                    key={index}
                    service={service}
                    projectId={projectDetails.id}
                  />
                )
              }

              return null
            })}
          </div>
        ) : (
          <p className='pt-8 text-center'>Services not found!</p>
        )}
      </section>
    </>
  )
}

export default ProjectIdPage
