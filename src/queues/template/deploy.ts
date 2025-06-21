import { addBuildpacksDeploymentQueue } from '../app/buildpacks-deployment'
import { addDockerImageDeploymentQueue } from '../app/dockerImage-deployment'
import { addDockerFileDeploymentQueue } from '../app/dockerfile-deployment'
import { addRailpackDeployQueue } from '../app/railpack-deployment'
import { addCreateDatabaseQueue } from '../database/create'
import { addExposeDatabasePortQueue } from '../database/expose'
import { addUpdateEnvironmentVariablesQueue } from '../environment/update'
import configPromise from '@payload-config'
import { Job } from 'bullmq'
import { NodeSSH } from 'node-ssh'
import { getPayload } from 'payload'

import { getQueue, getWorker } from '@/lib/bullmq'
import { dokku } from '@/lib/dokku'
import { jobOptions, pub, queueConnection } from '@/lib/redis'
import { sendActionEvent } from '@/lib/sendEvent'
import { dynamicSSH } from '@/lib/ssh'
import { Service } from '@/payload-types'

interface QueueArgs {
  services: Service[]
  serverDetails: {
    id: string
  }
  tenantDetails: {
    slug: string
  }
}

async function waitForJobCompletion(
  job: Job,
  options: {
    maxAttempts?: number
    pollingInterval?: number
    successStates?: string[]
    failureStates?: string[]
  } = {},
) {
  const {
    maxAttempts = 180, // 30 minutes with 10s interval
    pollingInterval = 10000, // 10 seconds
    successStates = ['completed'],
    failureStates = ['failed', 'unknown'],
  } = options

  let attempts = 0

  while (attempts < maxAttempts) {
    try {
      // Get the current state of the job
      const state = await job.getState()

      // Check if job completed successfully
      if (successStates.includes(state)) {
        return { success: true }
      }

      // Check if job failed
      if (failureStates.includes(state)) {
        throw new Error('job execution failed')
      }

      // Wait for the polling interval before checking again
      await new Promise(resolve => setTimeout(resolve, pollingInterval))
      attempts++
    } catch (error) {
      throw new Error(
        `Error polling job ${job.id}: ${error instanceof Error ? error.message : ''}`,
      )
    }
  }

  // If we've reached the maximum number of attempts, consider it a timeout
  throw new Error(`Error execution timeout`)
}

export const addTemplateDeployQueue = async (data: QueueArgs) => {
  const QUEUE_NAME = `server-${data.serverDetails.id}-deploy-template`

  const deployTemplateQueue = getQueue({
    name: QUEUE_NAME,
    connection: queueConnection,
  })

  // todo: need to add deployment strategy which will sort the services or based on dependency
  // todo: change the waitForJobCompletion method from for-loop to performant way
  getWorker<QueueArgs>({
    name: QUEUE_NAME,
    connection: queueConnection,
    processor: async job => {
      const { services, tenantDetails } = job.data
      const payload = await getPayload({ config: configPromise })

      try {
        // Step 2: map through deployment sequence
        // 2.1 create a deployment entry in database
        // 2.2 if it's docker or app create app first, then add environment variables
        // 2.3 trigger the respective queue
        // 2.4 use waitUntilFinished and go-to next step anything
        for await (const createdService of services) {
          const {
            project,
            type,
            providerType,
            githubSettings,
            provider,
            populatedVariables,
            variables,
            ...serviceDetails
          } = createdService

          console.log({
            project,
            type,
            providerType,
            githubSettings,
            provider,
            populatedVariables,
            variables,
            ...serviceDetails,
          })

          const deploymentResponse = await payload.create({
            collection: 'deployments',
            data: {
              service: serviceDetails.id,
              status: 'queued',
            },
          })

          // sending refresh event after deployment entry got created
          sendActionEvent({
            pub,
            action: 'refresh',
            tenantSlug: tenantDetails.slug,
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
              if (providerType === 'github' && githubSettings) {
                let ssh: NodeSSH | null = null
                const builder = serviceDetails.builder ?? 'railpack'

                try {
                  ssh = await dynamicSSH(sshDetails)
                  const appCreationResponse = await dokku.apps.create(
                    ssh,
                    serviceDetails?.name,
                  )

                  // app creation failed need to thronging an error
                  if (!appCreationResponse) {
                    throw new Error(
                      `❌ Failed to create ${serviceDetails?.name}`,
                    )
                  }

                  let updatedServiceDetails: Service | null = null

                  // if variables are added updating the variables
                  if (variables?.length) {
                    const environmentVariablesQueue =
                      await addUpdateEnvironmentVariablesQueue({
                        sshDetails,
                        serverDetails: {
                          id: project?.server?.id,
                        },
                        serviceDetails: {
                          id: serviceDetails.id,
                          name: serviceDetails.name,
                          noRestart: true,
                          previousVariables: [],
                          variables: variables ?? [],
                        },
                        tenantDetails,
                        exposeDatabase: true,
                      })

                    await waitForJobCompletion(environmentVariablesQueue)

                    // fetching the latest details of the service
                    updatedServiceDetails = await payload.findByID({
                      collection: 'services',
                      id: serviceDetails.id,
                    })
                  }

                  const updatedPopulatedVariables =
                    updatedServiceDetails?.populatedVariables ||
                    populatedVariables

                  const updatedVariables =
                    updatedServiceDetails?.variables || variables

                  // triggering queue with latest values
                  if (builder === 'railpack') {
                    const railpackDeployQueue = await addRailpackDeployQueue({
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
                        populatedVariables: updatedPopulatedVariables ?? '{}',
                        variables: updatedVariables ?? [],
                      },
                      tenantSlug: tenantDetails.slug,
                    })

                    await waitForJobCompletion(railpackDeployQueue)
                  } else if (builder === 'dockerfile') {
                    const dockerFileDeploymentQueue =
                      await addDockerFileDeploymentQueue({
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
                          populatedVariables: updatedPopulatedVariables ?? '{}',
                          variables: updatedVariables ?? [],
                        },
                        tenantSlug: tenantDetails.slug,
                      })

                    await waitForJobCompletion(dockerFileDeploymentQueue)
                  } else if (builder === 'buildPacks') {
                    const buildPacksDeploymentQueue =
                      await addBuildpacksDeploymentQueue({
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
                        tenantSlug: tenantDetails.slug,
                      })

                    await waitForJobCompletion(buildPacksDeploymentQueue)
                  }
                } catch (error) {
                  let message = error instanceof Error ? error.message : ''
                  throw new Error(message)
                } finally {
                  // disposing ssh even on error cases
                  if (ssh) {
                    ssh.dispose()
                  }
                }
              }
            }

            if (
              type === 'docker' &&
              serviceDetails.dockerDetails &&
              serviceDetails.dockerDetails.url
            ) {
              console.log('inside docker')
              let ssh: NodeSSH | null = null
              const { account, url, ports } = serviceDetails.dockerDetails

              try {
                ssh = await dynamicSSH(sshDetails)

                const appCreationResponse = await dokku.apps.create(
                  ssh,
                  serviceDetails?.name,
                )

                // app creation failed need to thronging an error
                if (!appCreationResponse) {
                  throw new Error(
                    `❌ Failed to create-app ${serviceDetails?.name}`,
                  )
                }

                let updatedServiceDetails: Service | null = null

                if (variables?.length) {
                  const environmentVariablesQueue =
                    await addUpdateEnvironmentVariablesQueue({
                      sshDetails,
                      serverDetails: {
                        id: project?.server?.id,
                      },
                      serviceDetails: {
                        id: serviceDetails.id,
                        name: serviceDetails.name,
                        noRestart: true,
                        previousVariables: [],
                        variables: variables ?? [],
                      },
                      tenantDetails,
                      exposeDatabase: true,
                    })

                  await waitForJobCompletion(environmentVariablesQueue)

                  // fetching the latest details of the service
                  updatedServiceDetails = await payload.findByID({
                    collection: 'services',
                    id: serviceDetails.id,
                  })
                }

                const updatedPopulatedVariables =
                  updatedServiceDetails?.populatedVariables ||
                  populatedVariables

                const updatedVariables =
                  updatedServiceDetails?.variables || variables

                const dockerImageQueueResponse =
                  await addDockerImageDeploymentQueue({
                    sshDetails,
                    appName: serviceDetails.name,
                    serviceDetails: {
                      deploymentId: deploymentResponse.id,
                      account: typeof account === 'object' ? account : null,
                      populatedVariables: updatedPopulatedVariables ?? '{}',
                      variables: updatedVariables ?? [],
                      imageName: url,
                      ports: ports ?? [],
                      serverId: project.server.id,
                      serviceId: serviceDetails.id,
                      name: serviceDetails.name,
                    },
                    tenantSlug: tenantDetails.slug,
                  })

                await waitForJobCompletion(dockerImageQueueResponse)
              } catch (error) {
                let message = error instanceof Error ? error.message : ''
                throw new Error(message)
              } finally {
                // disposing ssh even on error cases
                if (ssh) {
                  ssh.dispose()
                }
              }
            }

            if (type === 'database' && serviceDetails.databaseDetails?.type) {
              const { exposedPorts = [] } = serviceDetails?.databaseDetails
              // add ports exposing process
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
                  slug: tenantDetails.slug,
                },
              })

              await waitForJobCompletion(databaseQueueResponse)

              if (exposedPorts?.length) {
                const portsExposureResponse = await addExposeDatabasePortQueue({
                  databaseName: serviceDetails.name,
                  databaseType: serviceDetails.databaseDetails?.type,
                  sshDetails,
                  serverDetails: {
                    id: project.server.id,
                  },
                  serviceDetails: {
                    action: 'expose',
                    id: serviceDetails.id,
                  },
                  tenant: {
                    slug: tenantDetails.slug,
                  },
                })

                await waitForJobCompletion(portsExposureResponse)
              }
            }
          }
        }
      } catch (error) {
        let message = error instanceof Error ? error.message : ''
        throw new Error(message)
      }
    },
  })

  const id = `deploy-template:${new Date().getTime()}`
  return await deployTemplateQueue.add(id, data, { ...jobOptions, jobId: id })
}
