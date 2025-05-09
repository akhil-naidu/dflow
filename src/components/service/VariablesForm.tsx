'use client'

import Loader from '../Loader'
import { MariaDB, MongoDB, MySQL, PostgreSQL, Redis } from '../icons'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { zodResolver } from '@hookform/resolvers/zod'
import { Braces, Plus, Trash2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { JSX, useEffect, useState } from 'react'
import { useFieldArray, useForm, useFormContext } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { getProjectDatabasesAction } from '@/actions/project'
import { updateServiceAction } from '@/actions/service'
import { updateServiceSchema } from '@/actions/service/validator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Service } from '@/payload-types'
import { useDisableDeploymentContext } from '@/providers/DisableDeployment'

type StatusType = NonNullable<NonNullable<Service['databaseDetails']>['type']>

const databaseIcons: {
  [key in StatusType]: JSX.Element
} = {
  postgres: <PostgreSQL className='size-6' />,
  mariadb: <MariaDB className='size-6' />,
  mongo: <MongoDB className='size-6' />,
  mysql: <MySQL className='size-6' />,
  redis: <Redis className='size-6' />,
}

const ReferenceVariableDropdown = ({
  gettingDatabases,
  databaseList: list = [],
  index,
}: {
  databaseList: Service[]
  gettingDatabases: boolean
  index: number
}) => {
  const { setValue } = useFormContext()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          className='absolute right-2 top-1.5 h-6 w-6 rounded-sm'
          size='icon'
          variant='outline'>
          <Braces className='!h-3 !w-3' />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className='pb-2' align='end'>
        <DropdownMenuLabel>Reference Variables</DropdownMenuLabel>

        {gettingDatabases && (
          <DropdownMenuItem disabled>
            <Loader className='h-min w-min' />
            Fetching databases...
          </DropdownMenuItem>
        )}

        {list.length && !gettingDatabases
          ? list.map(database => {
              const { deployments, name } = database

              const disabled =
                typeof deployments?.docs?.find(deployment => {
                  return (
                    typeof deployment === 'object' &&
                    deployment?.status === 'success'
                  )
                }) === 'undefined'

              const environmentVariableValue =
                '$' +
                `{{${database.databaseDetails?.type}:${database.name + '.DATABASE_URI'}}}`

              return (
                <DropdownMenuItem
                  key={database.id}
                  disabled={disabled}
                  onSelect={() => {
                    setValue(
                      `variables.${index}.value`,
                      environmentVariableValue,
                    )
                  }}>
                  {database.databaseDetails?.type &&
                    databaseIcons[database.databaseDetails?.type]}

                  {`${name}.DATABASE_URI ${disabled ? '(not-deployed)' : ''}`}
                </DropdownMenuItem>
              )
            })
          : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const VariablesForm = ({ service }: { service: Service }) => {
  const [populatedVariables, _setPopulatedVariables] = useState(
    service.populatedVariables,
  )
  const { setDisable: disableDeployment } = useDisableDeploymentContext()
  const {
    execute: saveEnvironmentVariables,
    isPending: savingEnvironmentVariables,
  } = useAction(updateServiceAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.info('Added updating environment-variables to queue', {
          description: 'Restart service to apply changes',
          duration: 5000,
        })
      }
    },
    onError: ({ error }) => {
      toast.error(
        `Failed to update environment variables: ${error?.serverError}`,
      )
    },
  })

  const {
    execute: getDatabases,
    isPending: gettingDatabases,
    result: databaseList,
    hasSucceeded,
  } = useAction(getProjectDatabasesAction)

  useEffect(() => {
    if (!hasSucceeded) {
      getDatabases({
        id:
          typeof service.project === 'string'
            ? service.project
            : service.project.id,
      })
    }
  }, [])

  useEffect(() => {
    if (populatedVariables !== service.populatedVariables) {
      disableDeployment(false)
    }
  }, [service.populatedVariables])

  const form = useForm<z.infer<typeof updateServiceSchema>>({
    resolver: zodResolver(updateServiceSchema),
    defaultValues: {
      id: service.id,
      variables:
        Array.isArray(service.variables) && service.variables.length
          ? service.variables
          : [
              {
                key: '',
                value: '',
              },
            ],
    },
  })

  const {
    fields,
    append: appendVariable,
    remove: removeVariable,
  } = useFieldArray({
    control: form.control,
    name: 'variables',
  })

  const handleSubmit = (values: z.infer<typeof updateServiceSchema>) => {
    saveEnvironmentVariables(values)
    disableDeployment(true)
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className='w-full space-y-6'>
        <div className='space-y-2'>
          {fields.length ? (
            <div className='grid grid-cols-[1fr_1fr_2.5rem] gap-4 text-sm text-muted-foreground'>
              <p className='font-semibold'>Key</p>
              <p className='font-semibold'>Value</p>
            </div>
          ) : null}

          {fields.map((field, index) => {
            return (
              <div
                key={field?.id ?? index}
                className='grid grid-cols-[1fr_1fr_2.5rem] gap-4'>
                <FormField
                  control={form.control}
                  name={`variables.${index}.key`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`variables.${index}.value`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className='relative'>
                          <Input {...field} className='pr-8' />

                          <ReferenceVariableDropdown
                            index={index}
                            databaseList={databaseList?.data ?? []}
                            gettingDatabases={gettingDatabases}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  variant='ghost'
                  type='button'
                  size='icon'
                  onClick={() => {
                    removeVariable(index)
                  }}>
                  <Trash2 className='text-destructive' />
                </Button>
              </div>
            )
          })}

          <Button
            type='button'
            variant='outline'
            onClick={() => {
              appendVariable({
                key: '',
                value: '',
              })
            }}>
            <Plus /> New Variable
          </Button>
        </div>

        <div className='flex w-full justify-end gap-3'>
          <Button
            type='submit'
            variant='outline'
            disabled={savingEnvironmentVariables}>
            Save
          </Button>

          <Button
            type='submit'
            variant='secondary'
            disabled={savingEnvironmentVariables}>
            Save & Restart
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default VariablesForm
