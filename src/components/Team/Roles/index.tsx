'use client'

import { ShieldHalf } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useEffect } from 'react'

import { getRolesAction } from '@/actions/roles'
import { User } from '@/payload-types'

import RolesList from './RolesList'

const Roles = ({ teamMembers }: { teamMembers: User[] | undefined }) => {
  const {
    execute: getRoles,
    result: roles,
    isPending,
  } = useAction(getRolesAction)

  useEffect(() => {
    getRoles()
  }, [])

  return (
    <div className='rounded-2xl border bg-muted/10 p-6 shadow-lg'>
      <div className='flex items-center gap-x-2'>
        <ShieldHalf className='size-6' />
        <h1 className='text-2xl font-semibold'>Role Management</h1>
      </div>
      <p className='mt-2 text-muted-foreground'>
        Each role is displayed as an expandable section with detailed tabular
        information
      </p>
      <RolesList
        roles={roles?.data!}
        teamMembers={teamMembers}
        isPending={isPending}
      />
    </div>
  )
}

export default Roles
