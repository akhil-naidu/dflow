'use client'

import { MariaDB, MongoDB, MySQL, PostgreSQL, Redis } from '../icons'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { zodResolver } from '@hookform/resolvers/zod'
import { Database, Github, Plus } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Fragment, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createServiceAction } from '@/actions/service'
import { createServiceSchema } from '@/actions/service/validator'
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { slugify } from '@/lib/slugify'
import { Server } from '@/payload-types'

const databaseOptions = [
  {
    label: 'Postgres',
    value: 'postgres',
    icon: PostgreSQL,
  },
  {
    label: 'MongoDB',
    value: 'mongo',
    icon: MongoDB,
  },
  {
    label: 'MySQL',
    value: 'mysql',
    icon: MySQL,
  },
  {
    label: 'MariaDB',
    value: 'mariadb',
    icon: MariaDB,
  },
  {
    label: 'Redis',
    value: 'redis',
    icon: Redis,
  },
]

const CreateService = ({ server }: { server: Server }) => {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { plugins = [] } = server

  const { execute, isPending } = useAction(createServiceAction, {
    onSuccess: ({ data, input }) => {
      if (data?.success) {
        if (data.redirectUrl) {
          router.push(data?.redirectUrl)
        }
        toast.success(`Redirecting to ${input.name} service page...`)
        setOpen(false)
      }
    },
    onError: ({ error }) => {
      toast.error(`Failed to create service: ${error.serverError}`)
    },
  })

  const form = useForm<z.infer<typeof createServiceSchema>>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: {
      name: '',
      projectId: params.id,
    },
  })

  const { type } = useWatch({ control: form.control })

  function onSubmit(values: z.infer<typeof createServiceSchema>) {
    execute(values)
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={state => {
          setOpen(state)
          if (!state) {
            form.reset()
          }
        }}>
        <DialogTrigger asChild>
          <Button>
            <Plus />
            Create Service
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new service</DialogTitle>
            <DialogDescription className='sr-only'>
              This will create a new service
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='w-full space-y-6'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={e => {
                          form.setValue('name', slugify(e.target.value), {
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
                name='type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>

                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select a type' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='database'>
                          <div className='flex items-center gap-1.5'>
                            <Database size={16} className='text-blue-500' />
                            Database
                          </div>
                        </SelectItem>

                        <SelectItem value='app'>
                          <div className='flex items-center gap-1.5'>
                            <Github size={16} />
                            App (Git based application)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />

              {type === 'database' && (
                <FormField
                  control={form.control}
                  name='databaseType'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Database</FormLabel>

                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select a type' />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel className='mb-2 inline-block w-[calc(var(--radix-select-trigger-width)-16px)] text-wrap font-normal'>
                              To deploy database which are disabled, please
                              enable appropriate plugin on{' '}
                              <Link
                                className='text-primary underline'
                                href={`/settings/servers/${server.id}?tab=plugins`}>
                                server
                              </Link>
                            </SelectLabel>
                          </SelectGroup>

                          {databaseOptions.map(
                            ({ label, value, icon: Icon }) => {
                              const optionDisabled =
                                !plugins ||
                                !plugins.find(
                                  plugin => plugin.name === value,
                                ) ||
                                plugins.find(plugin => plugin.name === value)
                                  ?.status === 'disabled'

                              return (
                                <Fragment key={value}>
                                  <SelectItem
                                    value={value}
                                    disabled={optionDisabled}>
                                    <span className='flex gap-2'>
                                      <Icon className='size-5' />
                                      {label}
                                    </span>
                                  </SelectItem>
                                </Fragment>
                              )
                            },
                          )}
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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

              <DialogFooter>
                <Button type='submit' disabled={isPending}>
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CreateService
