import {
  SoftDeletePluginAccess,
  SoftDeletePluginOptions,
} from 'node_modules/@payload-bites/soft-delete/dist/types'
import { CollectionConfig } from 'payload'

const isAdmin: SoftDeletePluginAccess = async ({ req }) => {
  const { user } = req

  if (user?.role?.includes('admin')) {
    return true
  }

  return false
}

const commonCollectionConfig = {
  enableRestore: true,
  enableHardDelete: true,
  hardDeleteAccess: isAdmin,
  restoreAccess: isAdmin,
  softDeleteAccess: isAdmin,
}

export const softDeletePluginConfigCollections: SoftDeletePluginOptions['collections'] =
  {
    projects: commonCollectionConfig,
    backups: commonCollectionConfig,
    deployments: commonCollectionConfig,
    cloudProviderAccounts: commonCollectionConfig,
    dockerRegistries: commonCollectionConfig,
    gitProviders: commonCollectionConfig,
    securityGroups: commonCollectionConfig,
    servers: commonCollectionConfig,
    services: commonCollectionConfig,
    sshKeys: commonCollectionConfig,
    templates: commonCollectionConfig,
    tenants: commonCollectionConfig,
    users: commonCollectionConfig,
    traefik: commonCollectionConfig,
    roles: commonCollectionConfig,
  }

export const addBeforeOperationHook = (
  collections: CollectionConfig[],
): CollectionConfig[] => {
  return collections.map(collection => ({
    ...collection,
    hooks: {
      ...collection.hooks,
      beforeOperation: [
        ...(collection.hooks?.beforeOperation || []),
        async ({ operation, req, args }) => {
          const isAdminPanel = req?.pathname?.includes('payload-admin')
          const isAdminRole = req?.user?.role?.includes('admin')

          if (operation === 'read' && !isAdminPanel && !isAdminRole) {
            const where = args?.where || {}
            args.where = {
              ...where,
              deletedAt: { exists: false },
            }
          }

          return args
        },
      ],
    },
  }))
}
