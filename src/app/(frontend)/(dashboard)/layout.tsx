import configPromise from '@payload-config'
import { ArrowUpRight } from 'lucide-react'
import { headers } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React, { Suspense, use } from 'react'

import DocSidebar from '@/components/DocSidebar'
import { HeaderBanner } from '@/components/HeaderBanner'
import { NavUser } from '@/components/nav-user'
import { NavUserSkeleton } from '@/components/skeletons/DashboardLayoutSkeleton'
import { isDemoEnvironment } from '@/lib/constants'
import { User } from '@/payload-types'
import Provider from '@/providers/Provider'

const payload = await getPayload({ config: configPromise })

const NavUserSuspended = ({ user }: { user: User }) => {
  return <NavUser user={user} />
}

const DashboardLayoutInner = () => {
  const headersList = use(headers())

  const [{ totalDocs: totalUsers }, { user }] = use(
    Promise.all([
      payload.count({
        collection: 'users',

        where: { onboarded: { equals: true } },
      }),
      payload.auth({ headers: headersList }),
    ]),
  )

  if (!user) redirect('/sign-in')
  if (!user.onboarded && totalUsers === 0) redirect('/onboarding')

  return (
    <div className='sticky top-0 z-50 mx-auto flex w-full max-w-6xl items-center justify-between bg-background p-4'>
      <div className='flex min-h-9 items-center gap-2 text-2xl font-semibold'>
        <Link href={`/dashboard`} className='flex items-center gap-1'>
          <Image
            src='/images/dflow-no-bg.png'
            alt='dFlow-logo'
            width={32}
            height={32}
            className='object-contain'
          />
          <p className='hidden sm:block'>dFlow</p>
        </Link>

        {/* Breadcrumb placeholders */}
        <div id='projectName'></div>
        <div id='serviceName' className='-ml-2'></div>
        <div id='serverName' className='-ml-4'></div>
      </div>

      <div className='flex items-center gap-x-4'>
        <Link
          className='flex items-center text-sm hover:text-primary hover:underline'
          href={'https://dFlow.sh/changelog'}
          target='_blank'>
          <span>Changelog</span>
          <ArrowUpRight size={16} />
        </Link>

        <Suspense fallback={<NavUserSkeleton />}>
          <NavUserSuspended user={user} />
        </Suspense>
      </div>
    </div>
  )
}

const BannerLayout = ({ children }: { children: React.ReactNode }) => {
  return isDemoEnvironment ? (
    <div className='fixed top-0 z-50 w-full bg-background'>
      <HeaderBanner />
      {children}
    </div>
  ) : (
    <>{children}</>
  )
}

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <BannerLayout>
      <div className='relative flex h-screen w-full overflow-hidden'>
        <div className='flex-1 overflow-y-auto'>
          <DashboardLayoutInner />
          {children}
        </div>

        <DocSidebar />
      </div>
    </BannerLayout>
  )
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Provider>
      <DashboardLayout>{children}</DashboardLayout>
    </Provider>
  )
}
