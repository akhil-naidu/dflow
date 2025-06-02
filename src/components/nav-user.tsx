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
import { User } from '@/payload-types'

export function NavUser({ user }: { user: User }) {
  const { execute } = useAction(logoutAction)
  const params = useParams<{ organisation: string }>()

  const initial = user.email.slice(0, 1)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className='relative inline-block'>
              <Avatar className='h-8 w-8 cursor-pointer rounded-lg'>
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl || ''}
                    alt='User avatar'
                    className='h-8 w-8 rounded-lg object-cover'
                    loading='lazy'
                  />
                ) : (
                  <AvatarFallback className='rounded-lg uppercase'>
                    {initial}
                  </AvatarFallback>
                )}
              </Avatar>

              {/* Badge with letter at bottom right */}
              <span
                title={params.organisation}
                className='absolute -bottom-[0.5rem] -right-[0.5rem] flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-xs uppercase'>
                {params.organisation?.slice(0, 1)}
              </span>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className='w-64 rounded-lg'
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
              {user?.tenants?.map(({ tenant }) =>
                typeof tenant === 'object' ? (
                  <DropdownMenuItem className='group' key={tenant.id}>
                    <Link
                      href={`/${tenant?.slug}/dashboard`}
                      className='flex h-full w-full items-center justify-between gap-2 text-sm'>
                      <div className='inline-flex items-center gap-x-2'>
                        <Avatar className='h-6 w-6 rounded-lg'>
                          <AvatarFallback className='rounded-lg uppercase group-hover:text-accent'>
                            {tenant?.name.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>

                        <div className='inline-flex items-center gap-x-1'>
                          <p className='line-clamp-1 break-all'>
                            {tenant?.name}{' '}
                          </p>

                          <span className='text-muted-foreground group-hover:text-accent-foreground'>
                            {user.username === tenant?.slug && '(you)'}
                          </span>
                        </div>
                      </div>

                      {params.organisation === tenant?.slug && (
                        <Check size={20} className='text-primary' />
                      )}
                    </Link>
                  </DropdownMenuItem>
                ) : null,
              )}
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
