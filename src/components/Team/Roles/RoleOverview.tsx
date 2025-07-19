import { format } from 'date-fns'
import { CalendarRange, Settings } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Role, User } from '@/payload-types'

import { getBadgeVariant } from './RolesList'

const RoleOverview = ({
  role,
  usersCount,
}: {
  role: Role
  usersCount: number
}) => {
  return (
    <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
      <div className='space-y-4 rounded-2xl border bg-muted/10 p-4 text-center shadow-md'>
        <div className='flex gap-x-2'>
          <Settings className='size-6' />
          <h3 className='text-xl font-medium'>Basic Information</h3>
        </div>
        <div className='flex justify-between gap-6'>
          <p className='text-muted-foreground'>Name:</p>
          <p className='text-md max-w-[70%]'>{role?.name}</p>
        </div>
        <div className='flex justify-between gap-6'>
          <p className='text-muted-foreground'>Users:</p>
          <p className='text-md max-w-[70%]'>{usersCount}</p>
        </div>

        <div className='flex justify-between gap-6'>
          <p className='text-muted-foreground'>Department:</p>
          <Badge className='max-w-[70%]' variant={getBadgeVariant(role.type)}>
            {role?.type}
          </Badge>
        </div>
        <div className='flex justify-between gap-6'>
          <p className='text-muted-foreground'>Tags:</p>
          <div className='flex max-w-[70%] flex-wrap gap-2'>
            {role.tags &&
              role.tags?.map((tag, index) => (
                <Badge key={index} className='capitalize' variant={'outline'}>
                  {tag}
                </Badge>
              ))}
          </div>
        </div>
      </div>
      <div className='space-y-4 rounded-2xl border bg-muted/10 p-4 text-center shadow-md'>
        <div className='flex gap-x-2'>
          <CalendarRange className='size-6' />
          <h3 className='text-xl font-medium'>Timeline</h3>
        </div>
        <div className='flex justify-between gap-6'>
          <p className='text-muted-foreground'>Created:</p>
          <p className='text-md max-w-[70%]'>
            {format(new Date(role?.createdAt), 'd MMM yy')}
          </p>
        </div>
        <div className='flex justify-between gap-6'>
          <p className='text-muted-foreground'>Updated:</p>
          <p className='text-md max-w-[70%]'>
            {format(new Date(role?.updatedAt), 'd MMM yy')}
          </p>
        </div>
        <div className='flex justify-between gap-6'>
          <p className='text-muted-foreground'>Created by:</p>
          <div className='flex items-center gap-x-2'>
            <Avatar className='size-6'>
              <AvatarFallback className='rounded-lg uppercase group-hover:text-accent'>
                {(role?.createdUser as User).email.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <p className='text-md capitalize'>
              {(role?.createdUser as User)?.username}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoleOverview
