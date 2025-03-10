import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { Suspense } from 'react'

import { DynamicBreadcrumbs } from '@/components/DynamicBreadcrumbs'
import Loader from '@/components/Loader'
import { ProjectCard } from '@/components/ProjectCard'
import CreateProject from '@/components/project/CreateProject'

interface DashboardParams {
  code: string
}

const SuspendedPage = async () => {
  const payload = await getPayload({ config: configPromise })
  const { docs: projects } = await payload.find({
    collection: 'projects',
    pagination: false,
  })

  const { docs: servers } = await payload.find({
    collection: 'servers',
    pagination: false,
  })

  return (
    <section className='space-y-6'>
      <CreateProject servers={servers} />

      {projects.length ? (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {projects.map((project, index) => (
            <ProjectCard key={index} project={project} servers={servers} />
          ))}
        </div>
      ) : (
        <p className='pt-8 text-center'>Projects not found!</p>
      )}
    </section>
  )
}

const DashboardPage = ({ searchParams }: { searchParams: DashboardParams }) => {
  return (
    <>
      <DynamicBreadcrumbs items={[{ label: 'Dashboard' }]} />

      <Suspense fallback={<Loader className='h-96 w-full' />}>
        <SuspendedPage />
      </Suspense>
    </>
  )
}

export default DashboardPage
