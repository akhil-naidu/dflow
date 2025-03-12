'use client'

import { Button } from '../ui/button'
import { Github } from 'lucide-react'

import { githubAuthorize } from '@/actions/auth/action'

const GithubLogin = () => {
  return (
    <div className='flex min-h-screen w-full items-center justify-center'>
      <div className='mx-auto max-w-md p-6'>
        <div className='text-center text-2xl font-semibold'>
          Create your Flow
        </div>
        <Button className='my-6 w-full' onClick={async () => githubAuthorize()}>
          <Github /> Login using Github
        </Button>
        <div className='mx-auto w-11/12 text-slate-500'>
          By signing up, you are agreeing to our <span>Terms of Service</span>
        </div>
      </div>
    </div>
  )
}

export default GithubLogin
