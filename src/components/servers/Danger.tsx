'use client'

import Loader from '../Loader'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'

import { resetOnboardingAction } from '@/actions/server'
import { ServerType } from '@/payload-types-overrides'

import DeleteServerDialog from './DeleteServerDialog'

const Danger = ({ server }: { server: ServerType }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const {
    execute: resetOnboarding,
    isPending: isResetting,
    hasSucceeded: hasResetOnboarded,
  } = useAction(resetOnboardingAction, {
    onSuccess: data => {
      if (data.data?.success) {
        toast.success('Onboarding reset triggered', {
          description:
            'This will uninstall both Dokku and Railpack, and reset onboarding for this server.',
        })
      }
    },
    onError: error => {
      toast.error(error.error.serverError)
    },
  })

  const isResetDisabled =
    isResetting || !server.sshConnected || hasResetOnboarded

  return (
    <Card className='border-destructive/40 bg-destructive/10 hover:border-destructive/60'>
      <CardHeader className='pb-4'>
        <CardTitle className='flex items-center gap-2 text-destructive'>
          <AlertTriangle className='h-5 w-5' />
          Danger Zone
        </CardTitle>
        <p className='text-sm text-muted-foreground'>
          These actions are irreversible and will permanently affect your server
          configuration.
        </p>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Reset Server Section */}
        <div className='rounded-lg border bg-background p-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-start gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-md bg-muted'>
                <RotateCcw className='h-5 w-5 text-muted-foreground' />
              </div>
              <div className='flex-1 space-y-1'>
                <h3 className='font-semibold'>Reset Server</h3>
                <p className='text-sm text-muted-foreground'>
                  Uninstalls Dokku and Railpack, clears associated data, removes
                  attached domains, and plugins.
                </p>
                <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                  <AlertTriangle className='h-3 w-3' />
                  This will remove all installed packages and configurations
                </div>
              </div>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant='destructive' disabled={isResetDisabled}>
                  {isResetting ? (
                    <>
                      <Loader className='mr-2 h-4 w-4' />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className='mr-2 h-4 w-4' />
                      Reset Server
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className='flex items-center gap-2'>
                    <AlertTriangle className='h-5 w-5 text-destructive' />
                    Reset Server
                  </DialogTitle>
                  <DialogDescription className='space-y-2'>
                    <p>
                      This will uninstall Dokku and Railpack, and reset the
                      server configuration completely.
                    </p>
                    <p className='font-medium text-destructive'>
                      Warning: All deployed applications and configurations will
                      be removed.
                    </p>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant='destructive'
                    disabled={isResetDisabled}
                    onClick={() => resetOnboarding({ serverId: server.id })}>
                    {isResetting ? (
                      <>
                        <Loader className='mr-2 h-4 w-4' />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <RotateCcw className='mr-2 h-4 w-4' />
                        Confirm Reset
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Delete Server Section */}
        <div className='rounded-lg border bg-background p-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-start gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-md bg-muted'>
                <Trash2 className='h-5 w-5 text-muted-foreground' />
              </div>
              <div className='flex-1 space-y-1'>
                <h3 className='font-semibold'>Delete Server</h3>
                <p className='text-sm text-muted-foreground'>
                  Permanently remove this server and all associated data from
                  your account.
                </p>
                <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                  <AlertTriangle className='h-3 w-3' />
                  This action cannot be undone and will delete all server data
                </div>
              </div>
            </div>
            <Button
              variant='destructive'
              onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className='mr-2 h-4 w-4' />
              Delete Server
            </Button>
          </div>
        </div>

        <DeleteServerDialog
          server={server}
          open={deleteDialogOpen}
          setOpen={setDeleteDialogOpen}
        />
      </CardContent>
    </Card>
  )
}

export default Danger
