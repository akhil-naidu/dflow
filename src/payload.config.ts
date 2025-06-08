import { softDeletePlugin } from '@payload-bites/soft-delete'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { resendAdapter } from '@payloadcms/email-resend'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { env } from 'env'
import { cookies } from 'next/headers'
import path from 'path'
import { buildConfig, getFieldsToSign, jwtSign } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Backups } from './payload/collections/Backups'
import { CloudProviderAccounts } from './payload/collections/CloudProviderAccounts'
import { Deployments } from './payload/collections/Deployments'
import { DockerRegistries } from './payload/collections/DockerRegistries'
import { GitProviders } from './payload/collections/GitProviders'
import { Projects } from './payload/collections/Projects'
import { SSHKeys } from './payload/collections/SSHkeys'
import SecurityGroups from './payload/collections/SecurityGroups'
import { Servers } from './payload/collections/Servers'
import { Services } from './payload/collections/Services'
import { Template } from './payload/collections/Templates'
import { Tenants } from './payload/collections/Tenants'
import { Users } from './payload/collections/Users'
import { logs } from './payload/endpoints/logs'
import { serverEvents } from './payload/endpoints/server-events'
import { checkServersConnectionsTask } from './payload/jobs/checkServersConnections'
import {
  addBeforeOperationHook,
  softDeletePluginConfigCollections,
} from './soft-delete'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const collectionsWithHook = addBeforeOperationHook([
  Users,
  Projects,
  Services,
  Servers,
  SSHKeys,
  GitProviders,
  Deployments,
  CloudProviderAccounts,
  Template,
  SecurityGroups,
  DockerRegistries,
  Tenants,
  Backups,
])

export default buildConfig({
  routes: {
    admin: '/payload-admin',
  },
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname, 'src'),
      importMapFile: path.resolve(
        dirname,
        'app',
        '(payload)',
        'payload-admin',
        'importMap.js',
      ),
    },
  },
  collections: collectionsWithHook,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: env.DATABASE_URI,
  }),
  sharp,
  plugins: [
    multiTenantPlugin({
      collections: {
        templates: {},
        gitProviders: {},
        servers: {},
        services: {},
        sshKeys: {},
        dockerRegistries: {},
        cloudProviderAccounts: {},
        securityGroups: {},
        projects: {},
        backups: {},
      },
      userHasAccessToAllTenants: user => Boolean(user?.role?.includes('admin')),
      enabled: true,
      tenantsArrayField: {
        includeDefaultField: false,
      },
    }),
    softDeletePlugin({
      enabled: true,
      collections: softDeletePluginConfigCollections,
    }),
  ],
  ...(env?.RESEND_API_KEY &&
    env?.RESEND_SENDER_EMAIL &&
    env?.RESEND_SENDER_NAME && {
      email: resendAdapter({
        defaultFromAddress: env.RESEND_SENDER_EMAIL,
        defaultFromName: env.RESEND_SENDER_NAME,
        apiKey: env.RESEND_API_KEY,
      }),
    }),
  endpoints: [
    {
      method: 'get',
      path: '/logs',
      handler: logs,
    },
    {
      method: 'get',
      path: '/server-events',
      handler: serverEvents,
    },
    {
      method: 'get',
      path: '/auto-login',
      handler: async ({ payload }) => {
        const cookieJar = await cookies()
        const { docs } = await payload.find({
          collection: 'users',
          where: {
            email: {
              equals: 'kaparapu.akhilnaidu@gmail.com',
            },
          },
          limit: 1,
        })

        const user = docs?.[0]

        const fieldsToSign = getFieldsToSign({
          collectionConfig: Users,
          email: 'kaparapu.akhilnaidu@gmail.com',
          user: {
            ...user,
            tenants: (user?.tenants ?? [])?.map(({ id, roles, tenant }) => ({
              id: id ?? '',
              roles,
              tenant: typeof tenant === 'string' ? tenant : tenant?.id,
            })),
            collection: 'users',
          },
        })

        console.log({ fieldsToSign })

        const response = await jwtSign({
          fieldsToSign,
          secret: process.env.PAYLOAD_SECRET || '',
          tokenExpiration: 60 * 60 * 24 * 7, // 7 days
        })

        console.dir({ response }, { depth: null })

        cookieJar.set('payload-token', response.token, {
          httpOnly: false,
          priority: 'medium',
        })

        // JWTAuthentication({
        //   strategyName: 'auto-login',
        //   headers: Headers(),
        //   payload:
        // })

        return Response.json({
          status: 'ok',
          timestamp: new Date().toISOString(),
        })
      },
    },
  ],
  jobs: {
    tasks: [checkServersConnectionsTask],
    access: {
      run: () => true,
    },
    autoRun: [
      {
        cron: '0/5 * * * *',
        limit: 10,
        queue: 'servers-ssh-connection-checks',
      },
    ],
    deleteJobOnComplete: false,
    shouldAutoRun: async () => {
      return true
    },
  },
})
