import { Github } from 'lucide-react'
import { cookies } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import React, { Suspense } from 'react'

import DocSidebar from '@/components/DocSidebar'
import { HeaderBanner } from '@/components/HeaderBanner'
import { NavUser } from '@/components/nav-user'
import { NavUserSkeleton } from '@/components/skeletons/DashboardLayoutSkeleton'
import { buttonVariants } from '@/components/ui/button'
import { isDemoEnvironment } from '@/lib/constants'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { cn } from '@/lib/utils'
import { User } from '@/payload-types'
import Provider from '@/providers/Provider'

const NavUserSuspended = ({ user }: { user: User }) => {
  return <NavUser user={user} />
}

const DashboardLayoutInner = async () => {
  const cookieStore = await cookies()
  const organisationSlug = cookieStore.get('organisation')?.value
  const user = await getCurrentUser()

  if (!user) redirect('/sign-in')

  return (
    <div className='sticky top-0 z-50 w-full bg-background'>
      <div className='mx-auto flex w-full max-w-6xl items-center justify-between p-4'>
        <div className='flex min-h-9 items-center gap-2 text-2xl font-semibold'>
          <Link
            href={`/${organisationSlug}/dashboard`}
            className='flex items-center gap-1'>
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
          <div id='serviceName' className='-ml-2' />
          <div id='serverName' className='-ml-4' />
        </div>

        <div className='flex items-center gap-x-4'>
          <Link
            className={cn(
              buttonVariants({
                variant: 'ghost',
                size: 'sm',
              }),
              'group hidden md:inline-flex',
            )}
            target='_blank'
            href='https://github.com/akhil-naidu/dflow'>
            <div className='flex items-center'>
              <Github className='size-4' />
              <span className='ml-1 hidden md:inline'>Star on GitHub</span>{' '}
            </div>
          </Link>

          <Suspense fallback={<NavUserSkeleton />}>
            <NavUserSuspended user={user} />
          </Suspense>
        </div>
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
