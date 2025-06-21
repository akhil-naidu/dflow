'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { addBuildpacksDeploymentQueue } from '@/queues/app/buildpacks-deployment'
import { addDockerImageDeploymentQueue } from '@/queues/app/dockerImage-deployment'
import { addDockerFileDeploymentQueue } from '@/queues/app/dockerfile-deployment'
import { addRailpackDeployQueue } from '@/queues/app/railpack-deployment'
import { addRebuildAppQueue } from '@/queues/app/rebuilt'
import { addCreateDatabaseQueue } from '@/queues/database/create'

export const triggerDeployment = async ({
  serviceId,
  cache,
  tenantSlug,
}: {
  serviceId: string
  cache: 'cache' | 'no-cache'
  tenantSlug: string
}) => {
  const payload = await getPayload({ config: configPromise })

  const {
    project,
    type,
    providerType,
    githubSettings,
    provider,
    populatedVariables,
    variables,
    ...serviceDetails
  } = await payload.findByID({
    collection: 'services',
    depth: 10,
    id: serviceId,
  })

  let queueResponseId: string | undefined = ''

  const deploymentResponse = await payload.create({
    collection: 'deployments',
    data: {
      service: serviceId,
      status: 'queued',
    },
  })

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

    if (type === 'app') {
      // for redeploy with cache doing dokku ps:rebuild
      if (cache === 'cache') {
        const { id } = await addRebuildAppQueue({
          serverDetails: {
            id: project.server.id,
          },
          serviceDetails: {
            deploymentId: deploymentResponse.id,
            id: serviceId,
            name: serviceDetails.name,
          },
          sshDetails,
          tenantSlug,
        })

        queueResponseId = id
      } else {
        if (providerType === 'github' && githubSettings) {
          const builder = serviceDetails.builder ?? 'railpack'

          if (builder === 'railpack') {
            const { id } = await addRailpackDeployQueue({
              appName: serviceDetails.name,
              userName: githubSettings.owner,
              repoName: githubSettings.repository,
              branch: githubSettings.branch,
              sshDetails: sshDetails,
              serviceDetails: {
                deploymentId: deploymentResponse.id,
                serviceId: serviceDetails.id,
                provider,
                serverId: project.server.id,
                port: githubSettings.port
                  ? githubSettings.port.toString()
                  : '3000',
                populatedVariables: populatedVariables ?? '{}',
                variables: variables ?? [],
              },
              tenantSlug,
            })

            queueResponseId = id
          } else if (builder === 'dockerfile') {
            const { id } = await addDockerFileDeploymentQueue({
              appName: serviceDetails.name,
              userName: githubSettings.owner,
              repoName: githubSettings.repository,
              branch: githubSettings.branch,
              sshDetails: sshDetails,
              serviceDetails: {
                deploymentId: deploymentResponse.id,
                serviceId: serviceDetails.id,
                provider,
                serverId: project.server.id,
                port: githubSettings.port
                  ? githubSettings.port.toString()
                  : '3000',
                populatedVariables: populatedVariables ?? '{}',
                variables: variables ?? [],
              },
              tenantSlug,
            })

            queueResponseId = id
          } else if (builder === 'buildPacks') {
            const { id } = await addBuildpacksDeploymentQueue({
              appName: serviceDetails.name,
              userName: githubSettings.owner,
              repoName: githubSettings.repository,
              branch: githubSettings.branch,
              sshDetails: sshDetails,
              serviceDetails: {
                deploymentId: deploymentResponse.id,
                serviceId: serviceDetails.id,
                provider,
                serverId: project.server.id,
                port: githubSettings.port
                  ? githubSettings.port.toString()
                  : '3000',
              },
              tenantSlug,
            })

            queueResponseId = id
          }
        }
      }
    }

    if (type === 'database' && serviceDetails.databaseDetails?.type) {
      const databaseQueueResponse = await addCreateDatabaseQueue({
        databaseName: serviceDetails.name,
        databaseType: serviceDetails.databaseDetails?.type,
        sshDetails,
        serviceDetails: {
          id: serviceDetails.id,
          deploymentId: deploymentResponse.id,
          serverId: project.server.id,
        },
        tenant: {
          slug: tenantSlug,
        },
      })

      queueResponseId = databaseQueueResponse.id
    }

    if (
      type === 'docker' &&
      serviceDetails.dockerDetails &&
      serviceDetails.dockerDetails.url
    ) {
      // for redeploy with cache doing dokku ps:rebuild
      if (cache === 'cache') {
        const { id } = await addRebuildAppQueue({
          serverDetails: {
            id: project.server.id,
          },
          serviceDetails: {
            deploymentId: deploymentResponse.id,
            id: serviceId,
            name: serviceDetails.name,
          },
          sshDetails,
          tenantSlug,
        })

        queueResponseId = id
      } else {
        const { account, url, ports } = serviceDetails.dockerDetails

        const dockerImageQueueResponse = await addDockerImageDeploymentQueue({
          sshDetails,
          appName: serviceDetails.name,
          serviceDetails: {
            deploymentId: deploymentResponse.id,
            account: typeof account === 'object' ? account : null,
            populatedVariables: populatedVariables ?? '{}',
            variables: variables ?? [],
            imageName: url,
            ports: ports ?? [],
            serverId: project.server.id,
            serviceId: serviceDetails.id,
            name: serviceDetails.name,
          },
          tenantSlug,
        })

        queueResponseId = dockerImageQueueResponse.id
      }
    }
  }

  return queueResponseId
}
