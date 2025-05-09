'use server'

import configPromise from '@payload-config'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'
import * as ssh2 from 'ssh2'

import { protectedClient } from '@/lib/safe-action'

import {
  createSSHKeySchema,
  deleteSSHKeySchema,
  generateSSHKeySchema,
  updateSSHKeySchema,
} from './validator'

const payload = await getPayload({ config: configPromise })

// No need to handle try/catch that abstraction is taken care by next-safe-actions
export const createSSHKeyAction = protectedClient
  .metadata({
    // This action name can be used for sentry tracking
    actionName: 'createSSHKeyAction',
  })
  .schema(createSSHKeySchema)
  .action(async ({ clientInput, ctx }) => {
    const {
      userTenant: { tenant },
    } = ctx
    const { name, description, privateKey, publicKey } = clientInput

    const response = await payload.create({
      collection: 'sshKeys',
      data: {
        name,
        description,
        privateKey,
        publicKey,
        tenant,
      },
    })

    if (response) {
      revalidatePath(`/${tenant.slug}/security`)
    }

    return response
  })

export const updateSSHKeyAction = protectedClient
  .metadata({ actionName: 'updateSSHKeyAction' })
  .schema(updateSSHKeySchema)
  .action(async ({ clientInput }) => {
    const { id, ...data } = clientInput

    const response = await payload.update({
      id,
      data,
      collection: 'sshKeys',
    })

    if (response) {
      revalidatePath('/security')
    }

    return response
  })

export const deleteSSHKeyAction = protectedClient
  .metadata({
    // This action name can be used for sentry tracking
    actionName: 'deleteSSHKeyAction',
  })
  .schema(deleteSSHKeySchema)
  .action(async ({ clientInput, ctx }) => {
    const { id } = clientInput
    const {
      userTenant: { tenant },
    } = ctx

    const response = await payload.delete({
      collection: 'sshKeys',
      id,
    })

    if (response) {
      revalidatePath(`${tenant?.slug}/security`)
      return { deleted: true }
    }
  })

export const generateSSHKeyAction = protectedClient
  .metadata({
    actionName: 'generateSSHKeyAction',
  })
  .schema(generateSSHKeySchema)
  .action(async ({ clientInput }) => {
    const { comment = 'dFlow', type } = clientInput

    // Generate the SSH key pair using ssh2
    const keys =
      type === 'rsa'
        ? ssh2.utils.generateKeyPairSync('rsa', {
            bits: 2048,
            comment,
          })
        : ssh2.utils.generateKeyPairSync('ed25519', {
            comment,
          })

    return {
      privateKey: keys.private,
      publicKey: keys.public,
    }
  })
