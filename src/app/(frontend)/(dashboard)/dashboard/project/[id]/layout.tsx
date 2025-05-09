import { notFound } from 'next/navigation'
import React from 'react'

import { getProjectBreadcrumbs } from '@/actions/pages/project'

import ClientLayout from './layout.client'

interface Props {
  params: Promise<{
    id: string
  }>
  children: React.ReactNode
}

const layout = async ({ children, params }: Props) => {
  const { id } = await params
  const projectBreadcrumbs = await getProjectBreadcrumbs({ id })

  if (!projectBreadcrumbs?.data?.project) {
    return notFound()
  }

  const { project, projects } = projectBreadcrumbs.data

  return (
    <ClientLayout
      project={{
        id: project.id,
        name: project.name,
      }}
      projects={projects.docs}
      server={project.server}>
      {children}
    </ClientLayout>
  )
}

export default layout
