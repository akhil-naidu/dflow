import Layout from '../../../../components/onboarding/OnboardingLayout'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { Suspense } from 'react'

import Loader from '@/components/Loader'
import CreateGitAppForm from '@/components/gitProviders/CreateGitAppForm'
import GitProviderList from '@/components/gitProviders/GitProviderList'
import SkipButton from '@/components/gitProviders/SkipButton'

const SuspendedPage = async () => {
  const payload = await getPayload({ config: configPromise })

  const gitProviders = await payload.find({
    collection: 'gitProviders',
    pagination: false,
  })

  const { docs: gitProvidersDocs } = gitProviders

  return (
    <Layout
      currentStep={5}
      cardTitle={'Add Git Source'}
      prevStepUrl={'/onboarding/configure-domain'}
      nextStepUrl={''}
      disableNextStep={gitProvidersDocs.length !== 0}>
      <GitProviderList gitProviders={gitProvidersDocs} onboarding />
      <div className='flex items-end gap-x-2'>
        <CreateGitAppForm onboarding={true} />
        <SkipButton />
      </div>
    </Layout>
  )
}

export default async function Page() {
  return (
    <Suspense fallback={<Loader className='min-h-screen w-full' />}>
      <SuspendedPage />
    </Suspense>
  )
}
