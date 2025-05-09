'use client'

import Loader from '../Loader'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { signUpAction } from '@/actions/auth'
import { signUpSchema } from '@/actions/auth/validator'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { slugify } from '@/lib/slugify'

const SignUpForm: React.FC = () => {
  const router = useRouter()
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    mode: 'onBlur',
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const { handleSubmit } = form
  const { execute, isPending } = useAction(signUpAction, {
    onSuccess: ({ data }) => {
      if (data) {
        toast.success('Account created successfully!')
        router.push('/sign-in')
      }
    },
    onError: ({ error }) => {
      console.log({ error })
      toast.error(`Failed to create account: ${error.serverError}`)
    },
  })

  const onSubmit = async (data: z.infer<typeof signUpSchema>) => {
    execute(data)
  }

  return (
    <div className='flex min-h-screen w-full items-center justify-center'>
      <div className='w-full max-w-md p-6'>
        <Image
          src='/images/dflow-no-bg.png'
          alt='dFlow logo'
          className='m-auto mb-4'
          width={50}
          height={50}
        />
        <h1 className='mb-6 text-center text-3xl font-semibold'>Sign Up</h1>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
            <FormField
              control={form.control}
              name={'username'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>

                  <FormControl>
                    <Input
                      {...field}
                      onChange={e => {
                        e.stopPropagation()
                        e.preventDefault()

                        e.target.value = slugify(e.target.value)

                        field.onChange(e)
                      }}
                      type='text'
                      placeholder='john-deo'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={'email'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>

                  <FormControl>
                    <Input
                      {...field}
                      type='email'
                      placeholder='johndeo@gmail.com'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={'password'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>

                  <FormControl>
                    <Input {...field} type='password' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={'confirmPassword'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>

                  <FormControl>
                    <Input {...field} type='password' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type='submit' className='w-full' disabled={isPending}>
              {isPending ? <Loader /> : 'Sign Up'}
            </Button>
          </form>
        </Form>

        <div className='text-base-content/70 mt-4 text-center text-sm'>
          <p>
            Already have an account?{' '}
            <Link href='/sign-in' className='text-primary underline'>
              SignIn
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignUpForm
