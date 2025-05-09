'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import React from 'react'

import Tabs from '@/components/Tabs'
import { cn } from '@/lib/utils'

const LayoutClient = ({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) => {
  const pathName = usePathname()
  const params = useParams()

  const tabsList = [
    { label: 'Dashboard', slug: '/dashboard' },
    { label: 'Servers', slug: `/servers` },
    { label: 'Security', slug: `/security` },
    { label: 'Integrations', slug: `/integrations` },
    { label: 'Templates', slug: `/templates` },
    { label: 'Docs', slug: '/docs/getting-started/introduction' },
  ]

  return (
    <>
      <div className={cn('sticky top-[68px] z-40 bg-background')}>
        <div
          className='mx-auto w-full max-w-6xl overflow-x-scroll px-4'
          style={{ scrollbarWidth: 'none' }}>
          <Tabs
            tabs={tabsList.map(({ label, slug }) => ({
              label: (
                <Link href={`/${params.organisation}${slug}`}>{label}</Link>
              ),
              asChild: true,
            }))}
            defaultActiveTab={tabsList.findIndex(({ slug }) =>
              pathName.includes(slug),
            )}
          />
        </div>

        <div className='absolute bottom-0 z-[-10] h-[1px] w-full bg-border' />
      </div>

      <main
        className={cn('mx-auto mb-32 w-full max-w-6xl px-4 pt-4', className)}>
        {children}
      </main>
    </>
  )
}

export default LayoutClient
