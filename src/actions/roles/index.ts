'use server'

import { revalidatePath } from 'next/cache'

import { protectedClient } from '@/lib/safe-action'

import {
  createRoleSchema,
  permissionsSchema,
  updatePermissionsSchema,
} from './validator'

export const getRolesAction = protectedClient
  .metadata({
    actionName: 'getRolesAction',
  })
  .action(async ({ ctx }) => {
    const {
      userTenant: { tenant },
      payload,
    } = ctx

    const { docs: roles } = await payload.find({
      collection: 'roles',
      where: {
        and: [
          {
            'tenant.slug': {
              equals: tenant.slug,
            },
          },
        ],
      },
    })

    return roles
  })

export const updateRolePermissionsAction = protectedClient
  .metadata({
    actionName: 'updateRolePermissionsAction',
  })
  .schema(updatePermissionsSchema)
  .action(async ({ ctx, clientInput }) => {
    const {
      userTenant: { tenant },
      payload,
    } = ctx

    const { id, servers, templates, projects, services } = clientInput

    const response = await payload.update({
      collection: 'roles',
      id: id,
      data: {
        services,
        servers,
        projects,
        templates,
      },
    })

    if (response) {
      revalidatePath(`/${tenant.slug}/team`)
    }
    return response
  })

export const createRoleAction = protectedClient
  .metadata({
    actionName: 'createRoleAction',
  })
  .schema(createRoleSchema)
  .action(async ({ ctx, clientInput }) => {
    const {
      user,
      userTenant: { tenant },
      payload,
    } = ctx

    const {
      name,
      projects,
      services,
      servers,
      templates,
      description,
      tags,
      type,
    } = clientInput

    const parsedProjects = permissionsSchema.parse(projects)
    const parsedServices = permissionsSchema.parse(services)
    const parsedServers = permissionsSchema.parse(servers)
    const parsedTemplates = permissionsSchema.parse(templates)

    const response = await payload.create({
      collection: 'roles',
      data: {
        name,
        description,
        projects: parsedProjects,
        servers: parsedServers,
        services: parsedServices,
        templates: parsedTemplates,
        tags,
        createdUser: user?.id,
        type,
        tenant: tenant,
      },
    })

    if (response) {
      revalidatePath(`/${tenant.slug}/team`)
    }
    return response
  })
