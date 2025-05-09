'use client'

import { Button } from '../ui/button'
import { SquarePen, Trash2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import Link from 'next/link'
import { toast } from 'sonner'

import { deleteTemplate } from '@/actions/templates'
import { Card, CardContent } from '@/components/ui/card'
import { Template, Tenant } from '@/payload-types'

const TemplateDetails = ({ template }: { template: Template }) => {
  const { execute, isPending } = useAction(deleteTemplate, {
    onSuccess: ({ data }) => {
      if (data) {
        toast.success(`Template deleted successfully`)
      }
    },
    onError: ({ error }) => {
      toast.error(`Failed to delete template: ${error.serverError}`)
    },
  })

  return (
    <Card>
      <CardContent className='flex h-24 w-full items-center justify-between gap-3 pt-4'>
        <div className='flex items-center gap-3'>
          <div>
            <p className='font-semibold'>{template.name}</p>
            <span className='text-sm text-muted-foreground'>
              {template?.description}
            </span>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          <Link
            href={`/${(template?.tenant as Tenant)?.slug}/templates/compose?templateId=${template?.id}`}>
            <Button variant={'outline'}>
              <SquarePen size={20} />
            </Button>
          </Link>

          <Button
            disabled={isPending}
            onClick={() => {
              execute({ id: template.id })
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

export default TemplateDetails
