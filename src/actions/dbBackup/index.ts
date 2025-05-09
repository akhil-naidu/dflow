'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { protectedClient } from '@/lib/safe-action'
import { addInternalBackupQueue } from '@/queues/database/backup/internalBackup'
import { deleteInternalBackupQueue } from '@/queues/database/backup/internalBackupDelete'

import {
  internalDBBackupSchema,
  internalDbDeleteScheme,
  internalRestoreSchema,
} from './validator'

const payload = await getPayload({ config: configPromise })

export const internalBackupAction = protectedClient
  .metadata({
    actionName: 'internalBackupAction',
  })
  .schema(internalDBBackupSchema)
  .action(async ({ clientInput }) => {
    const { serviceId } = clientInput

    const { createdAt: backupCreatedTime, id: backupId } = await payload.create(
      {
        collection: 'backups',
        data: {
          service: serviceId,
          type: 'internal',
          status: 'in-progress',
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
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
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
  .action(async ({ clientInput }) => {
    const { serviceId, backupId } = clientInput

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
  .action(async ({ clientInput }) => {
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
      })
      queueResponseId = id
    }

    return {
      success: true,
      queueResponseId: queueResponseId,
    }
  })
