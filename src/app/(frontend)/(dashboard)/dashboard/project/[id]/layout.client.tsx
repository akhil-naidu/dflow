'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import SelectSearch from '@/components/SelectSearch'
import { Project, Server } from '@/payload-types'

const ProjectTerminal = dynamic(
  () => import('@/components/project/ProjectTerminal'),
  {
    ssr: false,
  },
)

const ClientLayout = ({
  project,
  children,
  server,
  projects,
}: {
  project: Project
  children: React.ReactNode
  server: Server | string
  projects: { id: string; name: string }[]
}) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      {children}

      {mounted &&
        createPortal(
          <div className='flex items-center gap-1 text-sm font-normal'>
            <Link
              href={`/dashboard/project/${typeof project === 'object' ? project.id : project}`}
              className='flex'>
              <svg
                fill='currentColor'
                viewBox='0 0 20 20'
                className='h-5 w-5 flex-shrink-0 stroke-border'
                aria-hidden='true'>
                <path d='M5.555 17.776l8-16 .894.448-8 16-.894-.448z'></path>
              </svg>{' '}
              {project.name}
            </Link>

            <SelectSearch projects={projects} placeholder='project' />
          </div>,
          document.getElementById('projectName') ?? document.body,
        )}

      {typeof server === 'object' && <ProjectTerminal server={server} />}
    </>
  )
}

export default ClientLayout
