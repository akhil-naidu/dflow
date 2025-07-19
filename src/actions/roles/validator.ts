import { z } from 'zod'

export const permissionsSchema = z.object({
  create: z.boolean().default(false),
  update: z.boolean().default(false),
  read: z.boolean().default(false),
  delete: z.boolean().default(false),
})

export const updatePermissionsSchema = z.object({
  id: z.string(),
  projects: permissionsSchema,
  services: permissionsSchema,
  servers: permissionsSchema,
  templates: permissionsSchema,
})

export type updatePermissionsType = z.infer<typeof updatePermissionsSchema>

export const createRoleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  projects: permissionsSchema,
  services: permissionsSchema,
  servers: permissionsSchema,
  templates: permissionsSchema,
  type: z
    .enum(['engineering', 'management', 'marketing', 'finance', 'sales'])
    .default('engineering'),
  tags: z.array(z.string()).nullable().optional(),
})

export type createRoleType = z.infer<typeof createRoleSchema>
