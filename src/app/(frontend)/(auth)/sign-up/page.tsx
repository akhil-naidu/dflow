import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { Suspense } from 'react'

import Loader from '@/components/Loader'
import SignUpForm from '@/components/sign-up/SignUpForm'

const SuspensePage = async () => {
  const payload = await getPayload({ config: configPromise })
  const { totalDocs } = await payload.count({
    collection: 'users',
  })

  // if (totalDocs > 0) {
  //   return redirect('/sign-in')
  // }

  return <SignUpForm />
}

const SignUpPage = async () => {
  return (
    <Suspense fallback={<Loader />}>
      <SuspensePage />
    </Suspense>
  )
}

export default SignUpPage
