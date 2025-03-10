import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { env } from 'env'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Deployments } from './payload/collections/Deployments'
import { Domains } from './payload/collections/Domains'
import { GitProviders } from './payload/collections/GitProviders'
import { Projects } from './payload/collections/Projects'
import { SSHKeys } from './payload/collections/SSHkeys'
import { Servers } from './payload/collections/Servers'
import { Services } from './payload/collections/Services'
import { Users } from './payload/collections/Users'
import { githubAuthCallbackpoint } from './payload/endpoints/auth'
import { databaseUpdate } from './payload/endpoints/databaseUpdate'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Projects,
    Services,
    Servers,
    SSHKeys,
    GitProviders,
    Deployments,
    Domains,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: env.DATABASE_URI,
  }),
  sharp,
  plugins: [],
  endpoints: [
    {
      method: 'post',
      path: '/databaseUpdate',
      handler: databaseUpdate,
    },
    githubAuthCallbackpoint,
  ],
})
