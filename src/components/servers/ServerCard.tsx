'use client'

import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { formatDistanceToNow } from 'date-fns'
import {
  AlertCircle,
  Clock,
  Ellipsis,
  HardDrive,
  Trash2,
  WifiOff,
} from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import Link from 'next/link'
import { Dispatch, SetStateAction, useState } from 'react'
import { toast } from 'sonner'

import { deleteServerAction } from '@/actions/server'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { isDemoEnvironment } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Server } from '@/payload-types'

export function DeleteServerAlert({
  server,
  open,
  setOpen,
}: {
  server: Server
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}) {
  const { id, name } = server

  const { execute } = useAction(deleteServerAction, {
    onExecute: () => {
      setOpen(false)
      toast.loading('Please wait deleting server...', { id })
    },
    onSuccess: ({ data }) => {
      if (data?.deleted) {
        toast.success('Successfully deleted server', { id })
      }
    },
    onError: ({ error }) => {
      toast.error(`Failed to delete server: ${error.serverError}`, {
        id,
      })
    },
  })

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Project</AlertDialogTitle>
          <AlertDialogDescription>
            {`Are you sure you want to delete the ${name}?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setOpen(false)}>
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            variant='destructive'
            onClick={() => {
              execute({
                id: server.id,
              })
            }}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const ServerCard = ({
  server,
  organisationSlug,
}: {
  server: Server
  organisationSlug: string
}) => {
  const [open, setOpen] = useState(false)
  const connectionStatus = server.connection?.status || 'unknown'
  const isConnected = connectionStatus === 'success'
  const lastChecked = server.connection?.lastChecked
    ? formatDistanceToNow(new Date(server.connection.lastChecked), {
        addSuffix: true,
      })
    : 'unknown'

  return (
    <>
      <Link href={`/${organisationSlug}/servers/${server.id}`} className='block h-full'>
        <Card
          className={cn(
            'h-full min-h-36 border-l-4 transition-all duration-200',
            isConnected
              ? 'border-l-green-500 hover:border-l-green-600'
              : 'border-l-red-500 hover:border-l-red-600',
          )}>
          <CardHeader className='w-full flex-row items-start justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <HardDrive />
                {server.name}
                <Badge
                  className={
                    isConnected
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-red-500/10 text-red-500'
                  }>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </CardTitle>
              <CardDescription className='line-clamp-1'>
                {server.description}
              </CardDescription>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='!mt-0'
                  disabled={isDemoEnvironment}
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}>
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align='end'>
                <DropdownMenuItem
                  className='cursor-pointer'
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    setOpen(true)
                  }}>
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>

          <CardContent>
            <p className='truncate'>{server.ip}</p>

            {!isConnected && (
              <div className='mt-2 flex items-center gap-2 text-sm text-red-500'>
                <WifiOff size={16} />
                <span>Connection error</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle size={14} className='cursor-help' />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Check server configuration or network status.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {/* Add empty div to maintain consistent card height when connected */}
            {isConnected && <div className='h-8'></div>}
          </CardContent>

          {server.connection && (
            <CardFooter className='text-sm text-muted-foreground'>
              <div className='flex items-center gap-1.5'>
                <Clock size={14} />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      {lastChecked !== 'unknown'
                        ? `Last checked ${lastChecked}`
                        : 'Status unknown'}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Connection status last updated: {lastChecked}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardFooter>
          )}
        </Card>
      </Link>

      <DeleteServerAlert server={server} open={open} setOpen={setOpen} />
    </>
  )
}

export default ServerCard
