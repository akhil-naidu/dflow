import { dokku } from '../../lib/dokku'
import { dynamicSSH } from '../../lib/ssh'
import { addExposeDatabasePortQueue } from '../database/expose'
import configPromise from '@payload-config'
import { Job } from 'bullmq'
import crypto from 'crypto'
import { NodeSSH } from 'node-ssh'
import nunjucks from 'nunjucks'
import { Payload, getPayload } from 'payload'
import { z } from 'zod'

import { createServiceSchema } from '@/actions/service/validator'
import { getQueue, getWorker } from '@/lib/bullmq'
import { TEMPLATE_EXPR } from '@/lib/constants'
import { pub, queueConnection } from '@/lib/redis'
import { sendActionEvent, sendEvent } from '@/lib/sendEvent'
import { server } from '@/lib/server'
import { parseDatabaseUrl } from '@/lib/utils'
import { Service } from '@/payload-types'

import { databaseVariablesList } from './validator'

export type DatabaseType = Exclude<
  z.infer<typeof createServiceSchema>['databaseType'],
  undefined
>

type VariablesType = NonNullable<Service['variables']>

interface QueueArgs {
  sshDetails: {
    privateKey: string
    host: string
    username: string
    port: number
    hostname?: string
  }
  serviceDetails: {
    name: string
    noRestart: boolean
    variables: VariablesType
    previousVariables: VariablesType
    id: string
  }
  serverDetails: {
    id: string
  }
  tenantDetails: {
    slug: string
  }
  exposeDatabase?: boolean
}

const knownVariables = [
  'DFLOW_PUBLIC_DOMAIN',
  // mongodb
  'MONGO_URI',
  'MONGO_PUBLIC_URI',
  'MONGO_NAME',
  'MONGO_USERNAME',
  'MONGO_PASSWORD',
  'MONGO_HOST',
  'MONGO_PUBLIC_HOST',
  'MONGO_PORT',
  'MONGO_PUBLIC_PORT',
  // postgres
  'POSTGRES_URI',
  'POSTGRES_PUBLIC_URI',
  'POSTGRES_NAME',
  'POSTGRES_USERNAME',
  'POSTGRES_PASSWORD',
  'POSTGRES_HOST',
  'POSTGRES_PUBLIC_HOST',
  'POSTGRES_PORT',
  'POSTGRES_PUBLIC_PORT',
  // redis
  'REDIS_URI',
  'REDIS_PUBLIC_URI',
  'REDIS_NAME',
  'REDIS_USERNAME',
  'REDIS_PASSWORD',
  'REDIS_HOST',
  'REDIS_PUBLIC_HOST',
  'REDIS_PORT',
  'REDIS_PUBLIC_PORT',
  // mariadb
  'MARIADB_URI',
  'MARIADB_PUBLIC_URI',
  'MARIADB_NAME',
  'MARIADB_USERNAME',
  'MARIADB_PASSWORD',
  'MARIADB_HOST',
  'MARIADB_PUBLIC_HOST',
  'MARIADB_PORT',
  'MARIADB_PUBLIC_PORT',
  // MySQL
  'MYSQL_URI',
  'MYSQL_PUBLIC_URI',
  'MYSQL_NAME',
  'MYSQL_USERNAME',
  'MYSQL_PASSWORD',
  'MYSQL_HOST',
  'MYSQL_PUBLIC_HOST',
  'MYSQL_PORT',
  'MYSQL_PUBLIC_PORT',
] as const

type KnownVariable = (typeof knownVariables)[number]

function isKnownVariable(name: string): name is KnownVariable {
  return (knownVariables as readonly string[]).includes(name)
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

// This function specify the variable-type
function classifyVariableType(value: string) {
  const matches = [...value.matchAll(TEMPLATE_EXPR)]

  if (matches.length === 0) return 'static'
  if (matches.length > 1 || !value.trim().startsWith('{{')) return 'combo'

  const expr = matches[0][1].trim()

  // function call like secret(...)
  if (/^secret\(\s*\d+,\s*['"][^'"]+['"]\s*\)$/.test(expr)) return 'function'

  // reference var: only dot notation (service.MONGO_URI)
  if (/^[a-zA-Z_][\w-]*\.[a-zA-Z_][\w]*$/.test(expr)) return 'reference'

  return 'unknown'
}

// Extract the reference variables from combination variable -> postgres://{{ service-name.USERNAME }}:{{ service-name.PASSWORD }} -> [service-name.USERNAME, service-name.PASSWORD]
function extractTemplateRefs(str: string) {
  const matches = str.match(/\{\{\s*[^}]+\s*\}\}/g)
  return matches ?? []
}

type FormattedVariablesType = NonNullable<Service['variables']>[number] & {
  generatedValue: string
}

// populates private database variables
async function updatePrivateDatabaseVariables({
  variable,
  ssh,
  serviceName,
  envAlias,
}: {
  variable: string
  ssh: NodeSSH
  serviceName: string
  envAlias: string
}) {
  // checking if variable name is url -> serviceName.MONGO_URL
  if (variable.includes('_URI')) {
    return `$(dokku config:get ${serviceName} ${envAlias}_URL)`
  }

  const echoResponse = await server.echo({
    ssh,
    command: `$(dokku config:get ${serviceName} ${envAlias}_URL)`,
  })

  // 2. parse the stdout
  if (echoResponse.code === 0) {
    const fields = parseDatabaseUrl(echoResponse.stdout)

    if (variable.includes('_NAME')) {
      return fields.databaseName ?? ''
    } else if (variable.includes('_USERNAME')) {
      return fields.username ?? ''
    } else if (variable.includes('_PASSWORD')) {
      return fields.password ?? ''
    } else if (variable.includes('_HOST')) {
      return fields.host ?? ''
    } else if (variable.includes('_PORT')) {
      return fields.port ?? ''
    }
  }

  return ''
}

// populates public database variables
async function updatePublicDatabaseVariables({
  databaseDetails,
  variableName,
  serverHost,
}: {
  variableName: string
  databaseDetails: NonNullable<Service['databaseDetails']>
  serverHost: string
}) {
  const connectionUrl = databaseDetails?.connectionUrl ?? ''
  const host = databaseDetails?.host ?? ''
  const port = databaseDetails?.port ?? ''
  const exposedPort = databaseDetails?.exposedPorts?.[0] ?? ''

  if (variableName.includes('_URI')) {
    return connectionUrl.replace(host, serverHost).replace(port, exposedPort)
  } else if (variableName.includes('_PUBLIC_HOST')) {
    return serverHost
  } else if (variableName.includes('_PUBLIC_PORT')) {
    return exposedPort
  }

  return ''
}

// populates reference variables
async function handleReferenceVariables({
  payload,
  ssh,
  tenantSlug,
  serviceDetails,
  serverDetails,
  sshDetails,
  variable,
  exposeDatabase,
}: {
  payload: Payload
  ssh: NodeSSH
  tenantSlug: string
  serviceDetails: QueueArgs['serviceDetails']
  serverDetails: QueueArgs['serverDetails']
  sshDetails: QueueArgs['sshDetails']
  variable: string
  exposeDatabase: boolean
}) {
  const extractedVariable = variable
    .match(TEMPLATE_EXPR)?.[0]
    ?.match(/\{\{\s*(.*?)\s*\}\}/)?.[1]
    ?.trim()

  if (extractedVariable) {
    const refMatch = extractedVariable.match(
      /^([a-zA-Z_][\w-]*)\.([a-zA-Z_][\w]*)$/,
    )

    if (refMatch) {
      const [, serviceName, variableName] = refMatch
      // if variable is in knownVariable list, populating it's value
      if (isKnownVariable(variableName)) {
        // for DFLOW_PUBLIC_DOMAIN variable checking domains of that service and updating the
        if (variableName === 'DFLOW_PUBLIC_DOMAIN') {
          try {
            const domains = await dokku.domains.list({
              ssh,
              appName: serviceName,
            })

            const domain = domains?.[0] ?? ''

            console.log({ domains })

            // incase of single domain directly assigning that value
            if (domains.length === 1) {
              return {
                [variable]: domain,
              }
            }

            // check for synced default domain
            const { docs } = await payload.find({
              collection: 'services',
              where: {
                and: [
                  {
                    name: {
                      equals: serviceName,
                    },
                    'tenant.slug': {
                      equals: tenantSlug,
                    },
                  },
                ],
              },
            })

            const serviceDetails = docs?.[0]

            console.dir({ serviceDetails }, { depth: null })

            if (serviceDetails) {
              const { domains = [] } = serviceDetails

              const defaultDomain = domains?.find(
                domainDetails => domainDetails.default && domainDetails.synced,
              )

              if (defaultDomain) {
                return {
                  [variable]: defaultDomain.domain,
                }
              }
            }

            return {
              [variable]: domain,
            }
          } catch (error) {
            return {
              [variable]: '',
            }

            // todo: add sendEvent showing error to user!
          }
        }

        // handle database variable linking 'MONGO_URI', 'POSTGRES_URI', 'REDIS_URI', 'MARIADB_URI', 'MYSQL_URI', 'MONGO_PUBLIC_URI', 'POSTGRES_PUBLIC_URI', 'REDIS_PUBLIC_URI', 'MARIADB_PUBLIC_URI', 'MYSQL_PUBLIC_URI'
        // aliasing serviceName to databaseName ex: DATABASE_URI={{ my-mongo-db:MONGO_URI }}
        const { success: isDatabaseVariable, data: databaseVariableName } =
          databaseVariablesList.safeParse(variableName)

        if (isDatabaseVariable) {
          const databaseName = serviceName
          const databaseType = databaseVariableName?.split('_')[0].toLowerCase()

          const formattedDatabaseVariableName = `${databaseName}-db`
          const envAlias = formattedDatabaseVariableName
            .replace(/-([a-z])/g, (_, char) => '_' + char.toUpperCase())
            .toUpperCase()

          // 1. Public database connection -> MONGO_PUBLIC_URI
          if (databaseVariableName.includes('PUBLIC')) {
            // check for database deployments & exposed ports
            const { docs } = await payload.find({
              collection: 'services',
              where: {
                and: [
                  {
                    name: {
                      equals: databaseName,
                    },
                  },
                  {
                    'tenant.slug': {
                      equals: tenantSlug,
                    },
                  },
                ],
              },
              joins: {
                deployments: {
                  limit: 1000,
                },
              },
            })

            const databaseExposureDetails = docs?.[0]

            // database found check
            if (!databaseExposureDetails) {
              sendEvent({
                message: `can't link ${databaseName} not found!`,
                pub,
                serverId: serverDetails.id,
              })

              return {
                [variable]: '',
              }
            }

            // database deployed check
            const deployments = databaseExposureDetails?.deployments?.docs ?? []

            const deploymentSucceed = deployments.some(
              deployment =>
                typeof deployment === 'object' &&
                deployment.status === 'success',
            )

            if (!deploymentSucceed) {
              sendEvent({
                message: `please deploy ${databaseName} database to link variable`,
                pub,
                serverId: serverDetails.id,
              })

              return {
                [variable]: '',
              }
            }

            // checking for exposed ports
            const hasExposedPorts =
              databaseExposureDetails?.databaseDetails?.exposedPorts ?? []

            // directly populating the url based on the sever-details, exposed-ports
            if (hasExposedPorts.length) {
              const generatedValue = await updatePublicDatabaseVariables({
                databaseDetails: databaseExposureDetails.databaseDetails!,
                variableName: databaseVariableName,
                serverHost: sshDetails.host,
              })

              return { [variable]: generatedValue }
            } else {
              // exposed based on a boolean expose and populate values
              if (exposeDatabase) {
                const databaseExposeResponse = await addExposeDatabasePortQueue(
                  {
                    sshDetails,
                    databaseName: databaseExposureDetails.name,
                    databaseType:
                      databaseExposureDetails?.databaseDetails?.type!,
                    serviceDetails: {
                      action: 'expose',
                      id: databaseExposureDetails.id,
                    },
                    serverDetails,
                    tenant: {
                      slug: tenantSlug,
                    },
                  },
                )

                try {
                  const exposeResponse = await waitForJobCompletion(
                    databaseExposeResponse,
                  )

                  if (exposeResponse.success) {
                    // fetching latest details after exposing database
                    const { docs } = await payload.find({
                      collection: 'services',
                      where: {
                        and: [
                          {
                            name: {
                              equals: databaseName,
                            },
                          },
                          {
                            'tenant.slug': {
                              equals: tenantSlug,
                            },
                          },
                        ],
                      },
                    })

                    const updatedDatabaseDetails = docs?.[0]

                    if (updatedDatabaseDetails) {
                      const { databaseDetails } = updatedDatabaseDetails
                      const hasExposedPorts =
                        databaseDetails?.exposedPorts ?? []

                      if (hasExposedPorts.length) {
                        const generatedValue =
                          await updatePublicDatabaseVariables({
                            databaseDetails: databaseDetails!,
                            variableName: databaseVariableName,
                            serverHost: sshDetails.host,
                          })

                        return { [variable]: generatedValue }
                      }
                    }
                  }
                } catch (error) {
                  const message = error instanceof Error ? error.message : ''

                  sendEvent({
                    message: `❌ Failed to expose ${databaseName}: ${message}`,
                    pub,
                    serverId: serverDetails.id,
                  })

                  return { [variable]: '' }
                }
              }
            }
          }
          // 2. Private database connection -> MONGO_URI
          else {
            let databaseLinkResponse: string[] = []

            // getting all database linked apps-list
            try {
              databaseLinkResponse = await dokku.database.listLinks({
                ssh,
                databaseName,
                databaseType,
              })
            } catch (error) {
              console.log(
                `${databaseName} is not linked to any services!`,
                error,
              )
            }

            // checking if database is linked
            if (databaseLinkResponse.includes(serviceDetails.name)) {
              const generatedValue = await updatePrivateDatabaseVariables({
                variable: databaseVariableName,
                envAlias,
                serviceName: serviceDetails.name,
                ssh,
              })

              console.log({ generatedValue })

              return { [variable]: generatedValue }
            }
            // link the database and use `$(dokku config:get serviceName SERVICE_NAME_DB_URL)`
            else {
              const databaseLinkResponse = await dokku.database.link({
                ssh,
                databaseName,
                databaseType,
                appName: serviceDetails.name,
                alias: envAlias,
                noRestart: true,
                options: {
                  onStdout: async chunk => {
                    sendEvent({
                      message: chunk.toString(),
                      pub,
                      serverId: serverDetails.id,
                    })
                  },
                  onStderr: async chunk => {
                    sendEvent({
                      message: chunk.toString(),
                      pub,
                      serverId: serverDetails.id,
                    })
                  },
                },
              })

              if (databaseLinkResponse.code === 0) {
                const generatedValue = await updatePrivateDatabaseVariables({
                  variable: databaseVariableName,
                  envAlias,
                  serviceName: serviceDetails.name,
                  ssh,
                })

                console.log({ generatedValue })

                return { [variable]: generatedValue }
              } else {
                sendEvent({
                  message: `❌ Failed to link ${databaseName} to ${serviceDetails.name}`,
                  pub,
                  serverId: serverDetails.id,
                })

                return { [variable]: '' }
              }
            }
          }
        }
      }
      // if variable is not in knownVariable list assuming it as variable from another app!
      else {
        return {
          [variable]: `$(dokku config:get ${serviceName} ${variableName})`,
        }
      }
    }
  }

  return { [variable]: '' }
}

export const addUpdateEnvironmentVariablesQueue = async (data: QueueArgs) => {
  const QUEUE_NAME = `server-${data.serverDetails.id}-update-environment-variables`

  const updateEnvironmentVariablesQueue = getQueue({
    name: QUEUE_NAME,
    connection: queueConnection,
  })

  getWorker<QueueArgs>({
    name: QUEUE_NAME,
    connection: queueConnection,
    processor: async job => {
      const payload = await getPayload({ config: configPromise })
      const {
        sshDetails,
        serviceDetails,
        serverDetails,
        tenantDetails,
        exposeDatabase = false,
      } = job.data
      const { variables, previousVariables } = serviceDetails
      let ssh: NodeSSH | null = null

      console.log(
        `starting updateEnvironmentVariables queue database for service: ${serviceDetails.name}`,
      )

      sendEvent({
        pub,
        message: 'Started updating environment variables!',
        serverId: serverDetails.id,
      })

      try {
        ssh = await dynamicSSH(sshDetails)
        // step 1: if variables are removed need to clear environment variables in dokku
        if (!variables.length && previousVariables.length) {
          const envResponse = await dokku.config.unset({
            ssh,
            name: serviceDetails.name,
            noRestart: serviceDetails.noRestart,
            keys: previousVariables.map(({ key }) => key),
            options: {
              onStdout: async chunk => {
                console.info(chunk.toString())
                sendEvent({
                  pub,
                  message: chunk.toString(),
                  serverId: serverDetails.id,
                })
              },
              onStderr: async chunk => {
                console.info(chunk.toString())
                sendEvent({
                  pub,
                  message: chunk.toString(),
                  serverId: serverDetails.id,
                })
              },
            },
          })

          if (envResponse.code === 0) {
            const environmentVariables = await dokku.config.listVars(
              ssh,
              serviceDetails.name,
            )

            const formattedEnvironmentVariables = environmentVariables.reduce(
              (acc, curr) => {
                acc[curr.key] = curr.value
                return acc
              },
              {} as Record<string, string>,
            )

            await payload.update({
              collection: 'services',
              id: serviceDetails.id,
              data: {
                populatedVariables: JSON.stringify(
                  formattedEnvironmentVariables,
                ),
              },
            })
          }

          return
        }

        // we'll store all the populated values inside this array
        const formattedVariables: FormattedVariablesType[] = []

        // initialing nunjucks for replacing functions
        const env = new nunjucks.Environment()

        // added secret generation function: {{ secret(32, "abcABC123") }}
        env.addGlobal('secret', (length: string, charset: string) => {
          const chars =
            charset ||
            'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
          const values = crypto.randomBytes(+length)

          return Array.from(values)
            .map(v => chars.charAt(v % chars.length))
            .join('')
        })

        // step 2: go through variables list, categorize and populate values accordingly
        for await (const variable of variables) {
          const { key, value } = variable
          // step 2.1: categorize environment variables
          const type = classifyVariableType(value)
          // step 2.2: generate values for variables
          switch (type) {
            // for static variables directly storing values
            case 'static':
              formattedVariables.push({ key, value, generatedValue: value })
              break
            // for functions using nunjucks to generate values
            case 'function':
              const generatedValue = env.renderString(value, {})
              formattedVariables.push({ key, value, generatedValue })
              break
            // for reference variables check these cases
            // check for variable value should be MONGO_URI, POSTGRES_URI, REDIS_URI, MARIA_URI, MYSQL_URI, DFLOW_PUBLIC_DOMAIN
            // for any other variable value use $(dokku config:get serviceName variableName)
            case 'reference':
              const generateKeyPair = await handleReferenceVariables({
                payload,
                ssh,
                sshDetails,
                serverDetails,
                serviceDetails,
                tenantSlug: tenantDetails.slug,
                exposeDatabase,
                variable: value,
              })

              formattedVariables.push({
                key,
                value,
                generatedValue: generateKeyPair[value] ?? '',
              })
              break
            case 'combo':
              // 1. populate the functions example-> something-{{ secret(64, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')}}
              let functionPopulatedValue = value

              // 2. split the all the reference variables-> postgres://{{ postgres-database.USERNAME }}{{ postgres-database.PASSWORD }}@{{ postgres-database.HOST }}:{{ postgres-database.PORT }}/{{ postgres-database.NAME }}
              const referenceVariablesList = extractTemplateRefs(value)

              // 3. loop through variables and populate value
              for await (const variable of referenceVariablesList) {
                const type = classifyVariableType(variable)

                // again checking type because nunjucks replacing other context variables as NaN (if context not provided)
                if (type === 'function') {
                  functionPopulatedValue = functionPopulatedValue.replace(
                    variable,
                    env.renderString(variable, {}) ?? '',
                  )
                }

                const generateKeyPair = await handleReferenceVariables({
                  payload,
                  ssh,
                  sshDetails,
                  serverDetails,
                  serviceDetails,
                  tenantSlug: tenantDetails.slug,
                  exposeDatabase,
                  variable,
                })

                functionPopulatedValue = functionPopulatedValue.replace(
                  variable,
                  generateKeyPair[variable],
                )
              }

              formattedVariables.push({
                key,
                value,
                generatedValue: functionPopulatedValue,
              })

              break
            case 'unknown':
              // invalid variable format sending warning to user & pushing env with empty value
              formattedVariables.push({ key, value, generatedValue: '' })

              sendEvent({
                pub,
                message: `❌ invalid variable syntax ${key} : ${value}`,
                serverId: serverDetails.id,
              })
              break
          }
        }

        if (formattedVariables.length) {
          try {
            const envResponse = await dokku.config.set({
              ssh,
              name: serviceDetails.name,
              values: formattedVariables.map(({ key, generatedValue }) => {
                return {
                  key,
                  value: generatedValue,
                }
              }),
              noRestart: serviceDetails.noRestart,
              options: {
                onStdout: async chunk => {
                  console.info(chunk.toString())
                  sendEvent({
                    pub,
                    message: chunk.toString(),
                    serverId: serverDetails.id,
                  })
                },
                onStderr: async chunk => {
                  console.info(chunk.toString())
                  sendEvent({
                    pub,
                    message: chunk.toString(),
                    serverId: serverDetails.id,
                  })
                },
              },
            })

            if (envResponse) {
              sendEvent({
                pub,
                message: `✅ Successfully updated environment variables for ${serviceDetails.name}`,
                serverId: serverDetails.id,
              })

              // after update of env, storing all variables in a json field
              // so we can use them in build args without an computation requirement
              const environmentVariables = await dokku.config.listVars(
                ssh,
                serviceDetails.name,
              )

              const formattedEnvironmentVariables = environmentVariables.reduce(
                (acc, curr) => {
                  acc[curr.key] = curr.value
                  return acc
                },
                {} as Record<string, string>,
              )

              await payload.update({
                collection: 'services',
                id: serviceDetails.id,
                data: {
                  populatedVariables: JSON.stringify(
                    formattedEnvironmentVariables,
                  ),
                },
              })

              sendEvent({
                pub,
                message: `Syncing details...`,
                serverId: serverDetails.id,
              })

              sendActionEvent({
                pub,
                action: 'refresh',
                tenantSlug: tenantDetails.slug,
              })
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : ''
            sendEvent({
              pub,
              message: `❌ Failed update environment variables for ${serviceDetails.name}: ${message}`,
              serverId: serverDetails.id,
            })
          }
        }
      } catch (error) {
        let message = error instanceof Error ? error.message : ''
        throw new Error(
          `❌ Failed update environment variables for ${serviceDetails?.name}: ${message}`,
        )
      } finally {
        ssh?.dispose()
      }
    },
  })

  return await updateEnvironmentVariablesQueue.add(QUEUE_NAME, data)
}
