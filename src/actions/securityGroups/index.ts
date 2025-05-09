'use server'

import configPromise from '@payload-config'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'
import { z } from 'zod'

import { protectedClient } from '@/lib/safe-action'

import {
  createSecurityGroupSchema,
  getSecurityGroupsSchema,
  updateSecurityGroupSchema,
} from './validator'

const payload = await getPayload({ config: configPromise })

export const createSecurityGroupAction = protectedClient
  .metadata({
    actionName: 'createSecurityGroupAction',
  })
  .schema(createSecurityGroupSchema)
  .action(async ({ clientInput, ctx }) => {
    const {
      userTenant: { tenant },
    } = ctx
    const {
      name,
      description,
      cloudProvider,
      cloudProviderAccount,
      inboundRules,
      outboundRules,
      tags,
    } = clientInput

    const securityGroup = await payload.create({
      collection: 'securityGroups',
      data: {
        name,
        description,
        cloudProvider,
        cloudProviderAccount,
        inboundRules,
        outboundRules,
        tags,
        syncStatus: 'pending',
        tenant,
      },
    })

    if (securityGroup) {
      revalidatePath(`${tenant.slug}/security`)
    }

    return securityGroup
  })

export const updateSecurityGroupAction = protectedClient
  .metadata({
    actionName: 'updateSecurityGroupAction',
  })
  .schema(updateSecurityGroupSchema)
  .action(async ({ clientInput, ctx }) => {
    const {
      userTenant: { tenant },
    } = ctx
    const {
      id,
      name,
      description,
      cloudProvider,
      cloudProviderAccount,
      inboundRules,
      outboundRules,
      tags,
    } = clientInput

    const updatedSecurityGroup = await payload.update({
      collection: 'securityGroups',
      id,
      data: {
        name,
        description,
        cloudProvider,
        cloudProviderAccount,
        inboundRules,
        outboundRules,
        tags,
        syncStatus: 'pending',
      },
    })

    if (updatedSecurityGroup) {
      revalidatePath(`/${tenant.slug}/security`)
    }

    return updatedSecurityGroup
  })

export const deleteSecurityGroupAction = protectedClient
  .metadata({
    actionName: 'deleteSecurityGroupAction',
  })
  .schema(
    z.object({
      id: z.string().min(1, 'ID is required'),
    }),
  )
  .action(async ({ clientInput, ctx }) => {
    const { id } = clientInput
    const {
      userTenant: { tenant },
    } = ctx

    const deleteSecurityGroup = await payload.delete({
      collection: 'securityGroups',
      id,
    })

    if (deleteSecurityGroup) {
      revalidatePath(`/${tenant.slug}/security`)
      return { deleted: true }
    }

    return deleteSecurityGroup
  })

export const syncSecurityGroupAction = protectedClient
  .metadata({
    actionName: 'syncSecurityGroupAction',
  })
  .schema(
    z.object({
      id: z.string().min(1, 'ID is required'),
    }),
  )
  .action(async ({ clientInput, ctx }) => {
    const { id } = clientInput
    const {
      userTenant: { tenant },
    } = ctx

    const updatedSecurityGroup = await payload.update({
      collection: 'securityGroups',
      id,
      data: {
        syncStatus: 'start-sync',
        lastSyncedAt: new Date().toISOString(),
      },
    })

    if (updatedSecurityGroup) {
      revalidatePath(`/${tenant.slug}/security`)
      return { synced: true }
    }

    return updatedSecurityGroup
  })

export const getSecurityGroupsAction = protectedClient
  .metadata({
    actionName: 'getSecurityGroupsAction',
  })
  .schema(getSecurityGroupsSchema)
  .action(async ({ clientInput }) => {
    const { cloudProviderAccountId } = clientInput

    const { docs: securityGroups } = await payload.find({
      collection: 'securityGroups',
      pagination: false,
      where: {
        and: [
          {
            cloudProvider: {
              equals: 'aws',
            },
          },
          {
            cloudProviderAccount: {
              equals: cloudProviderAccountId,
            },
          },
        ],
      },
    })

    return securityGroups
  })
