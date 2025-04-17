import { format } from 'date-fns'
import { Pencil, Trash2, Unlink } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'

import { deleteDockerRegistryAction } from '@/actions/dockerRegistry'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { isDemoEnvironment } from '@/lib/constants'
import { DockerRegistry } from '@/payload-types'

import DockerRegistryForm from './Form'

const EditForm = ({
  account,
  refetch,
}: {
  account: DockerRegistry
  refetch: () => void
}) => {
  return (
    <DockerRegistryForm account={account} refetch={refetch}>
      <Button size='icon' variant='outline' disabled={isDemoEnvironment}>
        <Pencil size={20} />
      </Button>
    </DockerRegistryForm>
  )
}

const DockerRegistryCard = ({
  account,
  refetch,
}: {
  account: DockerRegistry
  refetch: () => void
}) => {
  const { execute: deleteAccount, isPending: deletingAccount } = useAction(
    deleteDockerRegistryAction,
    {
      onSuccess: ({ data }) => {
        if (data?.id) {
          refetch()
        }
      },
    },
  )

  return (
    <Card key={account.id}>
      <CardContent className='flex w-full items-center justify-between gap-3 pt-4'>
        <div className='flex items-center gap-3'>
          <div>
            <p className='font-semibold'>{account?.name}</p>
            <time className='text-sm text-muted-foreground'>
              {format(new Date(account.createdAt), 'LLL d, yyyy h:mm a')}
            </time>
          </div>
        </div>

        <div className='flex items-center gap-4'>
          <EditForm account={account} refetch={refetch} />

          <Button
            size='icon'
            variant='outline'
            onClick={() => deleteAccount({ id: account.id })}
            disabled={deletingAccount || isDemoEnvironment}>
            <Trash2 size={20} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const DockerRegistryList = ({
  accounts,
  refetch,
}: {
  accounts: DockerRegistry[]
  refetch: () => void
}) => {
  return accounts.length ? (
    <div className='mt-4 space-y-4'>
      {accounts.map(account => {
        return (
          <DockerRegistryCard
            account={account}
            key={account.id}
            refetch={refetch}
          />
        )
      })}
    </div>
  ) : (
    <div className='flex h-40 w-full flex-col items-center justify-center gap-3 text-muted-foreground'>
      <Unlink size={28} />
      <p>No Registries connected!</p>
    </div>
  )
}

export default DockerRegistryList
