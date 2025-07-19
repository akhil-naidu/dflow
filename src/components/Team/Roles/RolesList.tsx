import { Eye, LockKeyhole, Users } from 'lucide-react'
import { useState } from 'react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Role, User } from '@/payload-types'

import CreateNewRole from './CreateNewRole'
import RoleOverview from './RoleOverview'
import RolePermissions from './RolePermissions'
import RoleUsers from './RoleUsers'

export const getBadgeVariant = (type: Role['type']) => {
  switch (type) {
    case 'engineering':
      return 'info'
    case 'management':
      return 'warning'
    case 'marketing':
      return 'success'
    case 'finance':
      return 'destructive'
    case 'sales':
      return 'secondary'
    default:
      return 'default'
  }
}

const RoleDetails = ({
  role,
  teamMembers,
}: {
  role: Role
  teamMembers: User[] | undefined
}) => {
  const assignedUsers = teamMembers?.filter(teamMember =>
    (teamMember as User)?.tenants?.some(
      tenant => (tenant?.role as Role)?.id === role.id,
    ),
  )
  return (
    <AccordionItem
      className='rounded-md border border-border px-4'
      value={role.id}
      key={role.id}>
      <AccordionTrigger className='flex w-full cursor-pointer items-center justify-between hover:no-underline'>
        <div className='max-w-[60%]'>
          <h3 className='text-lg font-semibold'> {role?.name} </h3>
          <p className='line-clamp-1 break-all text-sm text-muted-foreground'>
            {role?.description}
          </p>
        </div>
        <div className='flex flex-1 justify-end gap-x-4 pr-2'>
          <div className='inline-flex items-center gap-x-2'>
            <Users className='size-5' /> {assignedUsers?.length ?? 0}
          </div>
          <Badge className='uppercase' variant={getBadgeVariant(role?.type)}>
            {role?.type}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className='flex flex-col gap-4 text-balance'>
        <Tabs defaultValue='overview'>
          <div
            className='flex w-full gap-x-2 overflow-x-auto'
            style={{ scrollbarWidth: 'none' }}>
            <TabsList className='flex w-full min-w-max justify-around'>
              <TabsTrigger className='flex w-full gap-x-2' value='overview'>
                <Eye className='size-4' />
                Overview
              </TabsTrigger>
              <TabsTrigger className='flex w-full gap-x-2' value='permissions'>
                <LockKeyhole className='size-4' />
                Permissions
              </TabsTrigger>
              <TabsTrigger className='flex w-full gap-x-2' value='users'>
                <Users className='size-4' />
                Users
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview'>
            <RoleOverview role={role} usersCount={assignedUsers?.length ?? 0} />
          </TabsContent>
          <TabsContent value='permissions'>
            <RolePermissions role={role} />
          </TabsContent>
          <TabsContent value='users'>
            <RoleUsers assignedUsers={assignedUsers ?? []} />
          </TabsContent>
        </Tabs>
      </AccordionContent>
    </AccordionItem>
  )
}

const RolesList = ({
  roles,
  teamMembers,
  isPending,
}: {
  roles: Role[]
  teamMembers: User[] | undefined
  isPending: boolean
}) => {
  const [openItem, setOpenItem] = useState<string | undefined>(undefined)

  return isPending ? (
    <div className='mt-8 w-full space-y-4'>
      <Skeleton className='h-24 w-full' />
      <Skeleton className='h-24 w-full' />
      <Skeleton className='h-24 w-full' />
    </div>
  ) : (
    <Accordion
      type='single'
      value={openItem}
      onValueChange={setOpenItem}
      collapsible
      className='mt-8 w-full space-y-4'>
      <CreateNewRole setOpenItem={setOpenItem} />
      {roles?.map(role => (
        <RoleDetails key={role.id} role={role} teamMembers={teamMembers} />
      ))}
    </Accordion>
  )
}

export default RolesList
