import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { getPayload } from 'payload'
import React, { Suspense } from 'react'

import Loader from '@/components/Loader'
import ServerTerminal from '@/components/ServerTerminal'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset } from '@/components/ui/sidebar'
import Provider from '@/providers/Provider'
import RefreshProvider from '@/providers/RefreshProvider'

const SuspenseLayout = async ({ children }: { children: React.ReactNode }) => {
  const headersList = await headers()
  const payload = await getPayload({ config: configPromise })

  const { user } = await payload.auth({ headers: headersList })

  // Redirecting user to sign-in if user is not signed in
  if (!user) {
    // return redirect('/sign-in')
    return <div>dashboard</div>
  }

  return (
    <NuqsAdapter>
      <Provider>
        <AppSidebar user={user} />
        <SidebarInset>
          <main className='mt-4 px-4'>
            <RefreshProvider>{children}</RefreshProvider>

            <ServerTerminal />
          </main>
        </SidebarInset>
      </Provider>
    </NuqsAdapter>
  )
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    // Added a suspense boundary to show loading response until user promise is resolved
    <Suspense fallback={<Loader />}>
      <SuspenseLayout>{children}</SuspenseLayout>
    </Suspense>
  )
}
