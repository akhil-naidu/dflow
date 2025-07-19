import { tenantsArrayField } from '@payloadcms/plugin-multi-tenant/fields'
import { env } from 'env'
import type { CollectionConfig } from 'payload'

import { ResetPassword } from '@/emails/reset-password'
import { isAdmin } from '@/payload/access/isAdmin'

import { handleUserRoles } from './hooks/handleUserRoles'

const defaultTenantArrayField = tenantsArrayField({
  tenantsArrayFieldName: 'tenants',
  tenantsArrayTenantFieldName: 'tenant',
  tenantsCollectionSlug: 'tenants',
  arrayFieldAccess: {
    //update access controls
    read: () => true,
    update: () => true,
    create: () => true,
  },
  tenantFieldAccess: {
    read: () => true,
    update: () => true,
    create: () => true,
  },
  rowFields: [
    {
      name: 'roles',
      type: 'select',
      defaultValue: ['tenant-user'],
      hasMany: true,
      options: ['tenant-admin', 'tenant-user'],
      label: 'Tenant Roles',
      required: true,
    },
    {
      name: 'role',
      type: 'relationship',
      relationTo: 'roles',
      hasMany: false,
      label: 'Tenant Role',
      // required: true,
    },
  ],
})

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'Users & Tenants',
  },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7,
    forgotPassword: {
      generateEmailHTML: args => {
        return ResetPassword({
          actionLabel: 'Reset Your Password',
          buttonText: 'Reset Password',
          userName: args?.user.username,
          href: `${env.NEXT_PUBLIC_WEBSITE_URL}/reset-password?token=${args?.token}`,
        })
      },
    },
    useAPIKey: true,
  },
  hooks: {
    beforeChange: [handleUserRoles],
  },
  access: {
    admin: async ({ req }) => {
      const { user } = req

      if (user?.role?.includes('admin')) {
        return true
      }

      return false
    },
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
    unlock: isAdmin,
  },
  fields: [
    {
      name: 'username',
      label: 'Username',
      type: 'text',
      saveToJWT: true,
      unique: true,
    },
    {
      name: 'avatarUrl',
      type: 'text',
      label: 'Avatar URL',
    },
    {
      name: 'onboarded',
      type: 'checkbox',
      label: 'Onboarded',
      defaultValue: false,
    },
    {
      name: 'role',
      type: 'select',
      options: ['admin', 'user', 'demo'],
      hasMany: true,
      saveToJWT: true,
      defaultValue: 'user',
    },
    {
      ...defaultTenantArrayField,
      admin: {
        ...(defaultTenantArrayField?.admin || {}),
        position: 'sidebar',
      },
    },
  ],
}
