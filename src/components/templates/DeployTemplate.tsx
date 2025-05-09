'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Rocket } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  deployTemplateAction,
  getAllTemplatesAction,
} from '@/actions/templates'
import { deployTemplateSchema } from '@/actions/templates/validator'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Template } from '@/payload-types'
import { useArchitectureContext } from '@/providers/ArchitectureProvider'

const TemplateDeploymentForm = ({
  execute,
  isPending,
  templates,
}: {
  execute: () => void
  isPending: boolean
  templates?: Template[]
}) => {
  const dialogRef = useRef<HTMLButtonElement>(null)
  const params = useParams<{ id: string }>()

  const { execute: deployTemplate, isPending: deployingTemplate } = useAction(
    deployTemplateAction,
    {
      onSuccess: ({ data }) => {
        if (data?.success) {
          toast.success('Added to queue', {
            description: 'Added template deploy to queue',
          })

          dialogRef.current?.click()
        }
      },
      onError: ({ error }) => {
        toast.error(`Failed to deploy template: ${error?.serverError}`)
      },
    },
  )

  const form = useForm<z.infer<typeof deployTemplateSchema>>({
    resolver: zodResolver(deployTemplateSchema),
    defaultValues: {
      projectId: params.id,
    },
  })

  const { id } = useWatch({ control: form.control })

  useEffect(() => {
    if (templates === undefined) {
      execute()
    }
  }, [])

  function onSubmit(values: z.infer<typeof deployTemplateSchema>) {
    deployTemplate(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <FormField
          control={form.control}
          name='id'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template</FormLabel>
              <Select
                disabled={isPending || deployingTemplate}
                onValueChange={field.onChange}
                defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isPending
                          ? 'Fetching Templates...'
                          : 'Select a Template'
                      }
                    />
                  </SelectTrigger>
                </FormControl>

                <SelectContent>
                  {templates?.map(({ id, name, services = [] }) => (
                    <SelectItem
                      key={id}
                      value={id}
                      disabled={!services?.length}>
                      {`${name} (${services?.length} services)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <DialogClose ref={dialogRef} className='sr-only' />

          <Button
            type='submit'
            disabled={deployingTemplate || !id}
            isLoading={deployingTemplate}>
            Deploy
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

const DeployTemplate = ({
  disableDeployButton = false,
  disableReason = 'This action is currently unavailable',
}: {
  disableDeployButton?: boolean
  disableReason?: string
}) => {
  const { execute, result, isPending } = useAction(getAllTemplatesAction)
  const architectureContext = function useSafeArchitectureContext() {
    try {
      return useArchitectureContext()
    } catch (e) {
      return null
    }
  }

  const isDeploying = architectureContext()?.isDeploying
  const isButtonDisabled = disableDeployButton || isDeploying

  const deployButton = (
    <Button variant='outline' disabled={isButtonDisabled}>
      <Rocket className='mr-2' /> Deploy from Template
    </Button>
  )

  return (
    <Dialog>
      {isButtonDisabled ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>{deployButton}</div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isDeploying ? 'Deployment in progress' : disableReason}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <DialogTrigger asChild>{deployButton}</DialogTrigger>
      )}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deploy from Template</DialogTitle>
          <DialogDescription aria-describedby={undefined} />
        </DialogHeader>

        <TemplateDeploymentForm
          execute={execute}
          templates={result.data}
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  )
}

export default DeployTemplate
