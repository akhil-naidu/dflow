'use client'

import { Button } from '../ui/button'
import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { isDemoEnvironment } from '@/lib/constants'
import { CloudProviderAccount, SecurityGroup } from '@/payload-types'

import CreateSecurityGroupForm from './CreateSecurityGroupForm'

const CreateSecurityGroup = ({
  type = 'create',
  description = 'This form allows you to add a security group to your cloud environment.',
  securityGroup,
  cloudProviderAccounts,
}: {
  type?: 'create' | 'update'
  description?: string
  securityGroup?: SecurityGroup
  cloudProviderAccounts: CloudProviderAccount[]
}) => {
  const [open, setOpen] = useState<boolean>(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={isDemoEnvironment}
          onClick={e => e.stopPropagation()}
          size={type === 'update' ? 'icon' : 'default'}
          variant={type === 'update' ? 'outline' : 'default'}>
          {type === 'update' ? (
            <>
              <Pencil />
            </>
          ) : (
            <>
              <Plus />
              Add Security Group
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className='sm:max-w-4xl'>
        <DialogHeader>
          <DialogTitle>
            {type === 'update' ? 'Edit Security Group' : 'Add Security Group'}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <CreateSecurityGroupForm
          type={type}
          securityGroup={securityGroup}
          setOpen={setOpen}
          cloudProviderAccounts={cloudProviderAccounts}
        />
      </DialogContent>
    </Dialog>
  )
}

export default CreateSecurityGroup
