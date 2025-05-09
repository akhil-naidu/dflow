'use client'

import { Check, LogOut } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import { logoutAction } from '@/actions/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar'
import { Tenant, User } from '@/payload-types'

export function NavUser({ user }: { user: User }) {
  const { execute } = useAction(logoutAction)
  const initial = user.email.slice(0, 1)
  const params = useParams()
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className='h-8 w-8 cursor-pointer rounded-lg'>
              {/* <AvatarImage src={user.avatar} alt={user.name} /> */}
              <AvatarFallback className='rounded-lg uppercase'>
                {initial}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className='max-w-96 rounded-lg'
            side='bottom'
            align='end'>
            <DropdownMenuLabel>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>Account</span>
                <span className='truncate text-xs text-muted-foreground'>
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className='font-normal text-muted-foreground'>
                Team
              </DropdownMenuLabel>
              {user?.tenants?.map(tenant => (
                <DropdownMenuItem key={tenant.id}>
                  <Link
                    href={`/${(tenant?.tenant as Tenant)?.slug}/dashboard`}
                    className='flex h-full w-full items-center justify-between gap-2 text-sm'>
                    <div className='inline-flex items-center gap-x-2'>
                      <Avatar className='h-6 w-6 rounded-lg'>
                        <AvatarFallback className='rounded-lg uppercase'>
                          {(tenant?.tenant as Tenant)?.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <p className='line-clamp-1 break-all'>
                        {(tenant?.tenant as Tenant)?.name}{' '}
                        {user.username === (tenant?.tenant as Tenant)?.slug &&
                          '(you)'}
                      </p>
                    </div>
                    {params.organisation ===
                      (tenant?.tenant as Tenant)?.slug && (
                      <Check size={20} className='text-primary' />
                    )}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                execute()
              }}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
