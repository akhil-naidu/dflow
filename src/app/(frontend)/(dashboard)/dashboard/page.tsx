import LayoutClient from '../layout.client'
import { AlertCircle, Folder } from 'lucide-react'
import { Suspense } from 'react'

import { getProjectsAndServers } from '@/actions/pages/dashboard'
import { ProjectCard } from '@/components/ProjectCard'
import ServerTerminalClient from '@/components/ServerTerminalClient'
import CreateProject from '@/components/project/CreateProject'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeletons'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Service } from '@/payload-types'

const SuspendedDashboard = async () => {
  const result = await getProjectsAndServers()

  const servers = result?.data?.serversRes?.docs as {
    id: string
    name: string
    connection?:
      | {
          status?: ('success' | 'failed' | 'pending') | null
          lastChecked?: string | null
        }
      | undefined
  }[]

  const projects = result?.data?.projectsRes.docs

  // Check if there are any servers available
  const hasServers = servers.length > 0

  // Check if there are any connected servers
  const hasConnectedServers = servers.some(
    server => server.connection?.status === 'success',
  )

  return (
    <>
      <section className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div className='inline-flex items-center gap-1.5 text-2xl font-semibold'>
            <Folder />
            Projects
          </div>

          <CreateProject servers={servers} />
        </div>

        {/* Server Alerts */}
        {!hasServers && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>No Servers Available</AlertTitle>
            <AlertDescription>
              No servers have been configured. You need to add at least one
              server before creating projects.
            </AlertDescription>
          </Alert>
        )}

        {hasServers && !hasConnectedServers && (
          <Alert variant='warning'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>SSH Connection Issue</AlertTitle>
            <AlertDescription>
              None of your servers have an active SSH connection. Projects may
              not function properly until SSH connections are established.
            </AlertDescription>
          </Alert>
        )}

        {/* Projects display */}
        {projects?.length ? (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {projects.map((project, index) => {
              const services = (project?.services?.docs ?? []) as Service[]

              return (
                <ProjectCard
                  key={index}
                  project={project}
                  servers={servers}
                  services={services}
                />
              )
            })}
          </div>
        ) : (
          <section className='grid min-h-[calc(100vh-40vh)] w-full place-items-center'>
            <div className='relative mx-auto w-full max-w-lg rounded-lg border border-slate-800 bg-gradient-to-tr from-slate-800 to-slate-900 px-8 pb-6 pt-8 text-center'>
              <h4 className='inline-flex bg-gradient-to-r from-slate-200/60 via-slate-200 to-slate-200/60 bg-clip-text text-2xl font-bold text-transparent'>
                No Projects Found
              </h4>
              <p className='text-cq-text-secondary text-pretty pt-1'>
                You don't have any projects yet. Start by creating a new project
                {!hasServers && ' (add a server first)'}
                {hasServers &&
                  !hasConnectedServers &&
                  ' (connect to a server first)'}
              </p>
            </div>
          </section>
        )}
      </section>

      <ServerTerminalClient servers={servers} />
    </>
  )
}

const DashboardPage = () => {
  return (
    <LayoutClient>
      <Suspense fallback={<DashboardSkeleton />}>
        <SuspendedDashboard />
      </Suspense>
    </LayoutClient>
  )
}

export default DashboardPage
