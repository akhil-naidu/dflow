import { User as LucideUser } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { User as UserType } from '@/payload-types'

const RoleUsers = ({ assignedUsers }: { assignedUsers: UserType[] | [] }) => {
  return assignedUsers?.length <= 0 ? (
    <div className='rounded-2xl border bg-muted/10 p-8 text-center shadow-sm'>
      <div className='grid min-h-[15vh] place-items-center'>
        <div className='max-w-md space-y-4 text-center'>
          <div className='mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted'>
            <LucideUser className='h-6 w-6 animate-pulse text-muted-foreground' />
          </div>
          <h2 className='text-2xl font-semibold'>No Users Assigned</h2>
          <p className='text-muted-foreground'>
            This role currently has no users assigned. Assign users to give them
            the appropriate access and permissions.
          </p>
        </div>
      </div>
    </div>
  ) : (
    <div className='overflow-hidden rounded-lg border border-border'>
      <Table className='w-full'>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Username</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignedUsers?.map(teamMember => (
            <TableRow key={teamMember?.id}>
              <TableCell className='font-medium'>
                <div className='flex items-center gap-x-2'>
                  <Avatar className='size-10'>
                    <AvatarFallback className='rounded-lg uppercase group-hover:text-accent'>
                      {teamMember.email.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h6 className='text-md font-medium capitalize'>
                      {teamMember?.username}
                    </h6>
                    <p className='text-muted-foreground'>{teamMember?.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{teamMember?.username}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default RoleUsers
