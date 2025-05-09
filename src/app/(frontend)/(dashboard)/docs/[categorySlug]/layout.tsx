import LayoutClient from '../../layout.client'
import React, { Suspense } from 'react'

import { DocsSidebarSkeleton } from '@/components/skeletons/DocsSkeleton'

import DocsSidebar from './DocsSidebar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutClient>
      <section className='flex h-full w-full'>
        <Suspense fallback={<DocsSidebarSkeleton />}>
          <DocsSidebar />
        </Suspense>

        {/* Right Side Content */}
        <div className='h-full flex-1 p-6'>{children}</div>
      </section>
    </LayoutClient>
  )
}
