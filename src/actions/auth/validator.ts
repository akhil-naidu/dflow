import { z } from 'zod'

export const signInSchema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .email({ message: 'Email is invalid' }),
  password: z
    .string({ message: 'Password is required' })
    .min(6, { message: 'Password must be at least 6 characters' }),
})

export const signUpSchema = z
  .object({
    username: z
      .string({ message: 'Username is required' })
      .min(4, { message: 'Username must be at least 4 characters long' })
      .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
        message:
          'Must start and end with a lowercase letter or number, with hyphens allowed in between',
      }),
    email: z
      .string()
      .min(1, { message: 'Email is required' })
      .email({ message: 'Email is invalid' }),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters long' }),
    confirmPassword: z.string().min(6, {
      message: 'Confirm Password must be at least 6 characters long',
    }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const forgotPasswordSchema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .email({ message: 'Email is invalid' }),
})

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' }),
  token: z.string(),
})
