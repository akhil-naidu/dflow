'use server'

import { protectedClient } from '@/lib/safe-action'
import { addInternalBackupQueue } from '@/queues/database/backup/internalBackup'
import { deleteInternalBackupQueue } from '@/queues/database/backup/internalBackupDelete'

import {
  internalDBBackupSchema,
  internalDbDeleteScheme,
  internalRestoreSchema,
} from './validator'

export const getAllBackups = protectedClient
  .metadata({
    actionName: 'getAllBackups',
  })
  .action(async ({ ctx }) => {
    const { payload, userTenant } = ctx

    const { docs: backups } = await payload.find({
      collection: 'backups',
      pagination: false,
      sort: '-createdAt',
      where: {
        'tenant.slug': {
          equals: userTenant.tenant?.slug,
        },
      },
    })

    return backups
  })

export const internalBackupAction = protectedClient
  .metadata({
    actionName: 'internalBackupAction',
  })
  .schema(internalDBBackupSchema)
  .action(async ({ clientInput, ctx }) => {
    const { payload, userTenant } = ctx
    const { serviceId } = clientInput

    const { createdAt: backupCreatedTime, id: backupId } = await payload.create(
      {
        collection: 'backups',
        data: {
          service: serviceId,
          type: 'internal',
          status: 'in-progress',
          tenant: userTenant.tenant?.id,
        },
      },
    )

    const { project, ...serviceDetails } = await payload.findByID({
      collection: 'services',
      depth: 10,
      id: serviceId,
    })

    const now = new Date(backupCreatedTime)

    const formattedDate = [
      now.getUTCFullYear(),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      String(now.getUTCDate()).padStart(2, '0'),
      String(now.getUTCHours()).padStart(2, '0'),
      String(now.getUTCMinutes()).padStart(2, '0'),
      String(now.getUTCSeconds()).padStart(2, '0'),
    ].join('-')

    let queueResponseId: string | undefined = ''

    if (
      typeof project === 'object' &&
      typeof project?.server === 'object' &&
      typeof project?.server?.sshKey === 'object'
    ) {
      const sshDetails = {
        privateKey: project?.server?.sshKey?.privateKey,
        host: project?.server?.ip,
        username: project?.server?.username,
        port: project?.server?.port,
        hostname: project?.server?.hostname || undefined,
      }

      const { id } = await addInternalBackupQueue({
        databaseName: serviceDetails?.name,
        databaseType: serviceDetails?.databaseDetails?.type ?? '',
        sshDetails: {
          ...sshDetails,
        },
        type: 'export',
        serverDetails: {
          id: project?.server?.id,
        },
        dumpFileName: `${serviceDetails?.name}-${formattedDate}.dump`,
        serviceId,
        backupId,
        tenant: {
          slug: userTenant.tenant.slug,
        },
      })
      queueResponseId = id
    }

    return {
      success: true,
      queueResponseId: queueResponseId,
    }
  })

export const internalRestoreAction = protectedClient
  .metadata({
    actionName: 'internalRestoreAction',
  })
  .schema(internalRestoreSchema)
  .action(async ({ clientInput, ctx }) => {
    const { serviceId, backupId } = clientInput
    const { payload, userTenant } = ctx

    const { project, ...serviceDetails } = await payload.findByID({
      collection: 'services',
      depth: 10,
      id: serviceId,
    })

    let queueResponseId: string | undefined = ''

    if (
      typeof project === 'object' &&
      typeof project?.server === 'object' &&
      typeof project?.server?.sshKey === 'object'
    ) {
      const sshDetails = {
        privateKey: project?.server?.sshKey?.privateKey,
        host: project?.server?.ip,
        username: project?.server?.username,
        port: project?.server?.port,
        hostname: project?.server?.hostname || undefined,
      }

      const { id } = await addInternalBackupQueue({
        databaseName: serviceDetails?.name,
        databaseType: serviceDetails?.databaseDetails?.type ?? '',
        sshDetails: {
          ...sshDetails,
        },
        type: 'import',
        serverDetails: {
          id: project?.server?.id,
        },
        serviceId,
        backupId,
        tenant: {
          slug: userTenant.tenant.slug,
        },
      })
      queueResponseId = id
    }

    return {
      success: true,
      queueResponseId: queueResponseId,
    }
  })

export const internalDbDeleteAction = protectedClient
  .metadata({
    actionName: 'internalDbDeleteAction',
  })
  .schema(internalDbDeleteScheme)
  .action(async ({ clientInput, ctx }) => {
    const { payload, userTenant } = ctx
    const { backupId, serviceId, databaseType } = clientInput

    const { project, ...serviceDetails } = await payload.findByID({
      collection: 'services',
      depth: 10,
      id: serviceId,
    })

    let queueResponseId: string | undefined = ''

    if (
      typeof project === 'object' &&
      typeof project?.server === 'object' &&
      typeof project?.server?.sshKey === 'object'
    ) {
      const sshDetails = {
        privateKey: project?.server?.sshKey?.privateKey,
        host: project?.server?.ip,
        username: project?.server?.username,
        port: project?.server?.port,
        hostname: project?.server?.hostname || undefined,
      }

      const { id } = await deleteInternalBackupQueue({
        backupId,
        serviceId,
        sshDetails: {
          ...sshDetails,
        },
        databaseName: serviceDetails?.name,
        databaseType: databaseType || '',
        serverDetails: {
          id: project?.server?.id,
        },
        tenant: {
          slug: userTenant.tenant.slug,
        },
      })
      queueResponseId = id
    }

    return {
      success: true,
      queueResponseId: queueResponseId,
    }
  })
