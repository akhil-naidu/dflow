'use client'

import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import {
  CheckCircle,
  Clock,
  RefreshCw,
  Shield,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import {
  deleteSecurityGroupAction,
  syncSecurityGroupAction,
} from '@/actions/securityGroups'
import { isDemoEnvironment } from '@/lib/constants'
import { CloudProviderAccount, SecurityGroup } from '@/payload-types'

import UpdateSecurityGroup from './CreateSecurityGroup'

const syncStatusMap = {
  'in-sync': {
    label: 'In Sync',
    variant: 'default' as const,
    icon: <CheckCircle className='mr-1 h-3 w-3' />,
    className:
      'bg-green-900 text-green-200 border-green-700 ' +
      'hover:bg-green-800 hover:border-green-600',
  },
  'start-sync': {
    label: 'Syncing',
    variant: 'secondary' as const,
    icon: <RefreshCw className='mr-1 h-3 w-3 animate-spin' />,
    className:
      'bg-blue-900 text-blue-200 border-blue-700 ' +
      'hover:bg-blue-800 hover:border-blue-600',
  },
  pending: {
    label: 'Not Synced',
    variant: 'outline' as const,
    icon: <Clock className='mr-1 h-3 w-3' />,
    className:
      'bg-yellow-900 text-yellow-200 border-yellow-700 ' +
      'hover:bg-yellow-800 hover:border-yellow-600',
  },
  failed: {
    label: 'Failed',
    variant: 'destructive' as const,
    icon: <XCircle className='mr-1 h-3 w-3' />,
    className:
      'bg-red-900 text-red-200 border-red-700 ' +
      'hover:bg-red-800 hover:border-red-600',
  },
} as const

const SecurityGroupItem = ({
  securityGroup,
  cloudProviderAccounts,
}: {
  securityGroup: SecurityGroup
  cloudProviderAccounts: CloudProviderAccount[]
}) => {
  const { execute: executeDelete, isPending: isDeletePending } = useAction(
    deleteSecurityGroupAction,
    {
      onSuccess: ({ data }) => {
        if (data) {
          toast.success(`Successfully deleted security group`)
        }
      },
      onError: ({ error }) => {
        toast.error(`Failed to delete security group: ${error.serverError}`)
      },
    },
  )

  const { execute: executeSync, isPending: isSyncPending } = useAction(
    syncSecurityGroupAction,
    {
      onSuccess: ({ data }) => {
        if (data) {
          toast.success(`Successfully synced security group`)
        }
      },
      onError: ({ error }) => {
        toast.error(`Failed to sync security group: ${error.serverError}`)
      },
    },
  )

  const status = securityGroup.syncStatus || 'pending'
  const statusConfig = syncStatusMap[status]

  return (
    <Card className='transition-shadow hover:shadow-md'>
      <CardContent className='grid h-24 w-full grid-cols-[auto,1fr,auto,auto] items-center gap-4 p-4'>
        <Shield className='flex-shrink-0' size={20} />

        <div className='min-w-0 space-y-1 overflow-hidden'>
          <p className='truncate font-semibold'>{securityGroup.name}</p>
          <p className='truncate text-sm text-muted-foreground'>
            {securityGroup.description}
          </p>
        </div>

        <Badge
          variant={statusConfig.variant}
          className={`items-center justify-center ${statusConfig.className}`}>
          {statusConfig.icon}
          {statusConfig.label}
        </Badge>

        <div className='flex items-center gap-2'>
          <Button
            disabled={isSyncPending || isDemoEnvironment}
            onClick={() => {
              executeSync({ id: securityGroup.id })
            }}
            size='icon'
            variant='outline'
            title='Sync security group'
            className='h-9 w-9'>
            <RefreshCw
              size={16}
              className={isSyncPending ? 'animate-spin' : ''}
            />
          </Button>

          <UpdateSecurityGroup
            securityGroup={securityGroup}
            type='update'
            description='This form updates security group'
            cloudProviderAccounts={cloudProviderAccounts}
          />

          <Button
            disabled={isDeletePending || isDemoEnvironment}
            onClick={() => {
              executeDelete({ id: securityGroup.id })
            }}
            size='icon'
            variant='outline'
            title='Delete security group'
            className='h-9 w-9'>
            <Trash2 size={16} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const SecurityGroupsList = ({
  securityGroups,
  cloudProviderAccounts,
}: {
  securityGroups: SecurityGroup[]
  cloudProviderAccounts: CloudProviderAccount[]
}) => {
  return (
    <div className='mt-4 w-full space-y-3'>
      {securityGroups.map(group => (
        <SecurityGroupItem
          securityGroup={group}
          key={group.id}
          cloudProviderAccounts={cloudProviderAccounts}
        />
      ))}
    </div>
  )
}

export default SecurityGroupsList
