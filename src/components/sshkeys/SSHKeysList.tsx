'use client'

import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { KeyRound, Trash2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { deleteSSHKeyAction } from '@/actions/sshkeys'
import { SshKey } from '@/payload-types'

import UpdateSSHKeyForm from './CreateSSHKeyForm'

const SSHKeyItem = ({ sshKey }: { sshKey: SshKey }) => {
  const { execute, isPending } = useAction(deleteSSHKeyAction, {
    onSuccess: ({ data }) => {
      if (data) {
        toast.success(`Successfully deleted SSH key`)
      }
    },
    onError: ({ error }) => {
      toast.error(`Failed to delete SSH key: ${error.serverError}`)
    },
  })

  return (
    <Card className='max-w-5xl'>
      <CardContent className='flex w-full items-center justify-between gap-3 pt-4'>
        <div className='flex items-center gap-3'>
          <KeyRound size={20} />

          <div>
            <p className='font-semibold'>{sshKey.name}</p>
            <span className='text-sm text-muted-foreground'>
              {sshKey.description}
            </span>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          <UpdateSSHKeyForm
            sshKey={sshKey}
            type='update'
            description='This form updates SSH key'
          />

          <Button
            disabled={isPending}
            onClick={() => {
              execute({ id: sshKey.id })
            }}
            size='icon'
            variant='outline'>
            <Trash2 size={20} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const SSHKeysList = ({ keys }: { keys: SshKey[] }) => {
  return keys.map(key => <SSHKeyItem sshKey={key} key={key.id} />)
}

export default SSHKeysList
