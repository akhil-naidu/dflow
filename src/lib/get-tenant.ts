// utils/getTenant.ts
import configPromise from '@payload-config'
import { cookies, headers } from 'next/headers'
import { forbidden } from 'next/navigation'
import { getPayload } from 'payload'

import { Tenant } from '@/payload-types'

import { getCurrentUser } from './getCurrentUser'

type UserTenant = {
  tenant: Tenant
  roles: ('tenant-admin' | 'tenant-user')[]
}
export async function getTenant({
  organisation,
}: { organisation?: string } = {}) {
  const headersList = await headers()
  const cookieStore = await cookies()
  const slug = organisation
    ? organisation
    : cookieStore.get('organisation')?.value

  if (!slug) throw new Error('Organisation slug not found in cookie')

  const user = await getCurrentUser(headersList)
  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
  })

  const tenant = docs[0]

  if (!tenant) forbidden()

  const matchedTenantEntry = user?.tenants?.find(entry => {
    const tenantId =
      typeof entry.tenant === 'string' ? entry.tenant : entry.tenant.id
    return tenantId === tenant.id
  })

  if (!Boolean(matchedTenantEntry)) forbidden()
  return {
    user,
    userTenant: matchedTenantEntry as UserTenant,
    isInTenant: Boolean(matchedTenantEntry),
  }
}
