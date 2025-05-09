import { withContentCollections } from '@content-collections/next'
import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

// import { posthogHost } from '@/lib/constants'

const nextConfig: NextConfig = {
  // This will rewrite the events to posthog endpoint
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path(.*)',
        destination: 'https://us-assets.i.posthog.com/static/:path(.*)',
      },
      {
        source: '/ingest/:path(.*)',
        destination: 'https://us.i.posthog.com/:path(.*)',
      },
      {
        source: '/ingest/decide',
        destination: 'https://us.i.posthog.com/decide',
      },
    ]
  },
  serverExternalPackages: ['bullmq', 'ssh2', 'node-ssh'],
  experimental: {
    authInterrupts: true,
  },
  webpack: (config, { isServer }) => {
    // Handle .node files
    config.module.rules.push({
      test: /\.node$/,
      use: 'file-loader',
    })

    if (!isServer) {
      // Don't attempt to load these packages on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        bullmq: false,
        ssh2: false,
        'node-ssh': false,
      }
    }

    return config
  },
  output: 'standalone',
}

export default withContentCollections(withPayload(nextConfig))
