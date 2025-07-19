import { zodResolver } from '@hookform/resolvers/zod'
import { Tag, TagInput } from 'emblor'
import {
  CheckCircle,
  ChevronDown,
  CirclePlus,
  Lock,
  Plus,
  Settings,
} from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { createRoleAction } from '@/actions/roles'
import { createRoleSchema, createRoleType } from '@/actions/roles/validator'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/check-box'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

const CreateNewRole = ({
  setOpenItem,
}: {
  setOpenItem: (value: string | undefined) => void
}) => {
  const [createStep, setCreateStep] = useState(1)
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null)

  const router = useRouter()

  const [tags, setTags] = useState<Tag[]>([
    {
      id: '1',
      text: 'Custom',
    },
  ])

  const form = useForm<createRoleType>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'engineering',
      tags: ['Custom'],
    },
  })
  const { control, setValue, formState } = form

  const { execute: createRole, isPending: isRoleCreatePending } = useAction(
    createRoleAction,
    {
      onSuccess: () => {
        router.refresh()
        toast.success('Role created Successfully')
        form.reset()
        setCreateStep(1)
        setOpenItem('')
      },
      onError: () => {
        toast.error('Failed to create role')
      },
    },
  )

  const onSubmit = (data: createRoleType) => {
    createRole({
      ...data,
    })
  }

  return (
    <AccordionItem
      value='new-role'
      className='rounded-md border border-border px-4'>
      <AccordionTrigger className='flex w-full cursor-pointer items-center justify-between hover:no-underline'>
        <div className='flex items-center gap-x-2'>
          <CirclePlus className='size-8 text-primary' />
          <div>
            <h3 className='text-lg font-semibold'> Create New Role </h3>
            <p className='line-clamp-1 break-all text-sm text-muted-foreground'>
              Add new role with custom permissions and settings
            </p>
          </div>
        </div>

        <div className='flex flex-1 items-center justify-end gap-x-4 pr-2'>
          <Badge className='justify-end' variant={'info'}>
            Step {createStep} of 2
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className='px-6 pb-6'>
        <div className='space-y-6'>
          {/* Progress Indicator */}
          <div className='mb-8 flex items-center'>
            {[1, 2].map(step => (
              <div key={step} className='flex items-center'>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    step <= createStep
                      ? 'bg-primary transition-colors duration-300'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                  {step < createStep ? (
                    <CheckCircle className='h-4 w-4' />
                  ) : (
                    step
                  )}
                </div>
                {step < 2 && (
                  <div
                    className={`mx-2 h-1 w-[220px] ${step < createStep ? 'bg-primary' : 'bg-muted'}`}
                  />
                )}
              </div>
            ))}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {createStep === 1 && (
                <Card className='p-6'>
                  <CardHeader className='px-0 pt-0'>
                    <CardTitle className='flex items-center gap-2'>
                      <Settings className='h-5 w-5' />
                      Basic Information
                    </CardTitle>
                    <CardDescription>
                      Define the basic properties of your new role
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='px-0'>
                    <div className='space-y-4'>
                      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <FormField
                          name='name'
                          control={control}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role Name</FormLabel>
                              <FormControl>
                                <Input placeholder='Admin' {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          name='type'
                          control={control}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Department</FormLabel>
                              <FormControl>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue='engineering'>
                                  <SelectTrigger>
                                    <SelectValue placeholder='Select department' />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value='engineering'>
                                      Engineering
                                    </SelectItem>
                                    <SelectItem value='management'>
                                      Management
                                    </SelectItem>
                                    <SelectItem value='marketing'>
                                      Marketing
                                    </SelectItem>
                                    <SelectItem value='finance'>
                                      Finance
                                    </SelectItem>
                                    <SelectItem value='sales'>Sales</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name='tags'
                        render={({ field }) => (
                          <FormItem className='flex flex-col items-start'>
                            <FormLabel className='text-left'>Tags</FormLabel>
                            <FormControl>
                              <TagInput
                                {...field}
                                value={field.value ?? undefined}
                                placeholder='Enter a tag'
                                tags={tags}
                                setTags={newTags => {
                                  setTags(newTags)
                                  if (Array.isArray(newTags)) {
                                    setValue(
                                      'tags',
                                      newTags?.map(tag => tag.text),
                                    )
                                  }
                                }}
                                activeTagIndex={activeTagIndex}
                                setActiveTagIndex={setActiveTagIndex}
                                inlineTags={false}
                                inputFieldPosition='top'
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        name='description'
                        control={control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder='Complete access to applications'
                                onChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {createStep === 2 && (
                <Card className='p-6'>
                  <CardHeader className='px-0 pt-0'>
                    <CardTitle className='flex items-center gap-2'>
                      <Lock className='h-5 w-5' />
                      Permission Selection
                    </CardTitle>
                    <CardDescription>
                      Choose the permissions for this role.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='px-0'>
                    <div className='overflow-hidden rounded-lg border border-border'>
                      <Table className='w-full'>
                        <TableHeader>
                          <TableRow>
                            <TableHead className='w-[300px]'>
                              Collection
                            </TableHead>
                            <TableHead>Create</TableHead>
                            <TableHead>Read</TableHead>
                            <TableHead>Update</TableHead>
                            <TableHead>Delete</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className='text-md font-semibold'>
                              Projects
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name='projects.create'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        ref={field.ref}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name='projects.read'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        ref={field.ref}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name='projects.update'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        ref={field.ref}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name='projects.delete'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        ref={field.ref}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className='text-md font-semibold'>
                              Servers
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name='servers.create'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        ref={field.ref}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name='servers.read'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        ref={field.ref}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name='servers.update'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        ref={field.ref}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name='servers.delete'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        ref={field.ref}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className='text-md font-semibold'>
                              Services
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name='services.create'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        ref={field.ref}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name='services.read'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        ref={field.ref}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name='services.update'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        ref={field.ref}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name='services.delete'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        ref={field.ref}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className='text-md font-semibold'>
                              Templates
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name='templates.create'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        ref={field.ref}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name='templates.read'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        ref={field.ref}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name='templates.update'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        ref={field.ref}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name='templates.delete'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        ref={field.ref}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className='flex items-center justify-between pt-6'>
                <div className='flex items-center gap-2'>
                  {createStep > 1 && (
                    <Button
                      variant='outline'
                      type='button'
                      onClick={() => setCreateStep(createStep - 1)}>
                      <ChevronDown className='h-4 w-4 rotate-90' />
                      Previous
                    </Button>
                  )}
                </div>

                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      setOpenItem('')
                      setCreateStep(1)
                      form.reset()
                    }}>
                    Cancel
                  </Button>

                  {createStep < 2 && (
                    <Button
                      type='button'
                      onClick={() => {
                        // e.stopPropagation()
                        setCreateStep(createStep + 1)
                      }}
                      className='gap-2'>
                      Next Step
                      <ChevronDown className='h-4 w-4 -rotate-90' />
                    </Button>
                  )}

                  {createStep === 2 && (
                    <Button
                      type='submit'
                      disabled={isRoleCreatePending}
                      isLoading={isRoleCreatePending}>
                      <Plus className='h-4 w-4' />
                      Create Role
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export default CreateNewRole
