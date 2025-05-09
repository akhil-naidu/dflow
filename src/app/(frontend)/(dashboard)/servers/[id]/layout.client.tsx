'use client'

import { useProgress } from '@bprogress/next'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { parseAsStringEnum, useQueryState } from 'nuqs'
import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'

import SelectSearch from '@/components/SelectSearch'
import Tabs from '@/components/Tabs'
import { cn } from '@/lib/utils'
import { Server } from '@/payload-types'
import { ServerType } from '@/payload-types-overrides'

const ProjectTerminal = dynamic(
  () => import('@/components/project/ProjectTerminal'),
  {
    ssr: false,
  },
)

const tabsList = [
  { label: 'General', slug: 'general', disabled: false },
  { label: 'Plugins', slug: 'plugins', disabled: false },
  { label: 'Domains', slug: 'domains', disabled: false },
  { label: 'Monitoring', slug: 'monitoring', disabled: false },
] as const

const LayoutClient = ({
  children,
  server,
  servers,
}: {
  children: React.ReactNode
  server: ServerType
  servers: Server[]
}) => {
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useQueryState(
    'tab',
    parseAsStringEnum([
      'general',
      'monitoring',
      'plugins',
      'domains',
    ]).withDefault('general'),
  )

  const [mounted, setMounted] = useState(false)

  const params = useParams()

  useEffect(() => {
    setMounted(true)
  }, [])

  const { start, stop } = useProgress()

  const activeTab = tabsList.findIndex(({ slug }) => {
    return slug === tab
  })

  useEffect(() => {
    if (isPending) {
      start()
    } else {
      stop()
    }
  }, [isPending])

  return (
    <>
      <div className={cn('sticky top-[68px] z-40 bg-background')}>
        <div
          className='mx-auto w-full max-w-6xl overflow-x-scroll px-4'
          style={{ scrollbarWidth: 'none' }}>
          <Tabs
            tabs={tabsList.map(({ label, disabled }) => ({ label, disabled }))}
            onTabChange={index => {
              const tab = tabsList[index]
              startTransition(() => {
                setTab(tab.slug, {
                  shallow: false,
                })
              })
            }}
            defaultActiveTab={activeTab >= 0 ? activeTab : 0}
          />
        </div>
        <div className='absolute bottom-0 z-[-10] h-[1px] w-full bg-border' />
      </div>

      <main className='mx-auto mb-20 mt-4 w-full max-w-6xl px-4'>
        {children}
      </main>

      {mounted &&
        typeof window !== 'undefined' &&
        document.getElementById('serverName') &&
        createPortal(
          <div className='flex items-center gap-1 text-sm font-normal'>
            <svg
              fill='currentColor'
              viewBox='0 0 20 20'
              className='h-5 w-5 flex-shrink-0 stroke-border'
              aria-hidden='true'>
              <path d='M5.555 17.776l8-16 .894.448-8 16-.894-.448z'></path>
            </svg>{' '}
            {server.name}
            <SelectSearch
              organisationSlug={params.organisation as string}
              placeholder={'server'}
              servers={servers}
              serverId={server.id}
            />
          </div>,
          document.getElementById('serverName') ?? document.body,
        )}

      <ProjectTerminal server={server} />
    </>
  )
}

export default LayoutClient
