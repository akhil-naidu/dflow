import LayoutClient from '../../layout.client'
import configPromise from '@payload-config'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { use } from 'react'

import ServerForm from '@/components/servers/ServerForm'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { isDemoEnvironment } from '@/lib/constants'

interface PageProps {
  params: Promise<{
    organisation: string
  }>
}
const SuspendedAddNewServerPage = ({
  organisationSlug,
}: {
  organisationSlug: string
}) => {
  if (isDemoEnvironment) {
    return (
      <div className='flex flex-col items-center justify-center space-y-4 p-8'>
        <Alert className='max-w-lg'>
          <AlertTitle className='text-lg font-semibold'>
            Demo Environment
          </AlertTitle>
          <AlertDescription>
            Adding new servers is not available in the demo environment.
          </AlertDescription>
        </Alert>
        <Link href={`${organisationSlug}/servers`}>
          <Button variant='default'>Return to Servers</Button>
        </Link>
      </div>
    )
  }

  const payload = use(getPayload({ config: configPromise }))

  const [{ docs: sshKeys }, { docs: securityGroups }] = use(
    Promise.all([
      payload.find({
        collection: 'sshKeys',
        where: {
          'tenant.slug': {
            equals: organisationSlug,
          },
        },
        pagination: false,
      }),
      payload.find({
        collection: 'securityGroups',
        where: {
          'tenant.slug': {
            equals: organisationSlug,
          },
        },
        pagination: false,
      }),
    ]),
  )

  return <ServerForm sshKeys={sshKeys} securityGroups={securityGroups} />
}

const AddNewServerPage = async ({ params }: PageProps) => {
  const syncParams = await params
  if (isDemoEnvironment) {
    redirect('/servers')
  }

  return (
    <LayoutClient>
      <SuspendedAddNewServerPage organisationSlug={syncParams.organisation} />
    </LayoutClient>
  )
}

export default AddNewServerPage
