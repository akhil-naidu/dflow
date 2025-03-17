'use client'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createServerAction, updateServerAction } from '@/actions/server'
import { createServerSchema } from '@/actions/server/validator'
import {
  Dialog,
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
import { SshKey } from '@/payload-types'
import { ServerType } from '@/payload-types-overrides'

export const CreateServerForm = ({
  sshKeys,
  type = 'create',
  server,
}: {
  sshKeys: SshKey[]
  type?: 'create' | 'update'
  server?: ServerType
}) => {
  const pathName = usePathname()

  const form = useForm<z.infer<typeof createServerSchema>>({
    resolver: zodResolver(createServerSchema),
    defaultValues: server
      ? {
          name: server.name,
          description: server.description ?? '',
          ip: server.ip,
          port: server.port,
          sshKey:
            typeof server.sshKey === 'object'
              ? server.sshKey.id
              : server.sshKey,
          username: server.username,
        }
      : {
          name: '',
          description: '',
          ip: '',
          port: 22,
          sshKey: '',
          username: '',
        },
  })

  const router = useRouter()

  const { execute: createService, isPending: isCreatingService } = useAction(
    createServerAction,
    {
      onSuccess: ({ data, input }) => {
        if (data) {
          toast.success(`Successfully created ${input.name} service`)
          // setOpen(false)
          form.reset()
          if (pathName.includes('onboarding')) {
            router.push('/onboarding/configure-domain')
          }
        }
      },
      onError: ({ error }) => {
        toast.error(`Failed to create service: ${error.serverError}`)
      },
    },
  )

  const { execute: updateService, isPending: isUpdatingService } = useAction(
    updateServerAction,
    {
      onSuccess: ({ data, input }) => {
        if (data) {
          toast.success(`Successfully updated ${input.name} service`)
          // setOpen(false)
          form.reset()
        }
      },
      onError: ({ error }) => {
        toast.error(`Failed to update service: ${error.serverError}`)
      },
    },
  )

  function onSubmit(values: z.infer<typeof createServerSchema>) {
    if (type === 'create') {
      createService(values)
    } else if (type === 'update' && server) {
      // passing extra id-field during update operation
      updateService({ ...values, id: server.id })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='w-full space-y-2'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} className='rounded-sm' />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='sshKey'
          render={({ field }) => (
            <FormItem>
              <FormLabel>SSH key</FormLabel>

              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Select a SSH key' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sshKeys.map(({ name, id }) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='ip'
          render={({ field }) => (
            <FormItem>
              <FormLabel>IP Address</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='port'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    {...field}
                    onChange={e => {
                      form.setValue('port', +e.target.value, {
                        shouldValidate: true,
                      })
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='username'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button
            type='submit'
            disabled={isCreatingService || isUpdatingService}>
            {type === 'create' ? 'Add Server' : 'Update Server'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

// Using same form for create & update operations
const CreateServer = ({
  sshKeys,
  title = 'Add Server',
  description = 'This will add a new server',
  type = 'create',
  server,
}: {
  sshKeys: SshKey[]
  type?: 'create' | 'update'
  title?: string
  description?: string
  server?: ServerType
}) => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={type === 'update' ? 'outline' : 'default'}>
          {type === 'update' ? (
            <>
              <Pencil />
              Edit Server
            </>
          ) : (
            <>
              <Plus />
              Add Server
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className='sr-only'>
            {description}
          </DialogDescription>
        </DialogHeader>

        <CreateServerForm sshKeys={sshKeys} server={server} />
      </DialogContent>
    </Dialog>
  )
}

export default CreateServer
