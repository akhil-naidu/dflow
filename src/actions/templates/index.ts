'use server'

import configPromise from '@payload-config'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'
import {
  Config,
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from 'unique-names-generator'

import { REFERENCE_VARIABLE_REGEX } from '@/lib/constants'
import { protectedClient } from '@/lib/safe-action'
import { Service } from '@/payload-types'
import { addTemplateDeployQueue } from '@/queues/template/deploy'

import {
  DeleteTemplateSchema,
  createTemplateSchema,
  deployTemplateFromArchitectureSchema,
  deployTemplateSchema,
  updateTemplateSchema,
} from './validator'

const payload = await getPayload({ config: configPromise })

const handleGenerateName = (): string => {
  const nameConfig: Config = {
    dictionaries: [adjectives, animals, colors],
    separator: '-',
    length: 3,
    style: 'lowerCase',
  }

  return uniqueNamesGenerator(nameConfig)
}

export const createTemplate = protectedClient
  .metadata({
    // This action name can be used for sentry tracking
    actionName: 'createTemplate',
  })
  .schema(createTemplateSchema)
  .action(async ({ clientInput, ctx }) => {
    const { userTenant } = ctx
    const { name, description, services } = clientInput

    const response = await payload.create({
      collection: 'templates',
      data: {
        name,
        description,
        services,
        tenant: userTenant.tenant,
      },
    })
    return response
  })

export const deleteTemplate = protectedClient
  .metadata({
    // This action name can be used for sentry tracking
    actionName: 'deleteTemplate',
  })
  .schema(DeleteTemplateSchema)
  .action(async ({ clientInput, ctx }) => {
    const { id } = clientInput
    const { userTenant } = ctx

    const response = await payload.delete({
      collection: 'templates',
      id,
    })

    if (response) {
      revalidatePath(`${userTenant.tenant.slug}/templates`)
      return { deleted: true }
    }
  })

export const getTemplateById = protectedClient
  .metadata({ actionName: 'getTemplateById' })
  .schema(DeleteTemplateSchema)
  .action(async ({ clientInput, ctx }) => {
    const { id } = clientInput
    const { userTenant } = ctx
    const response = await payload.find({
      collection: 'templates',
      where: {
        and: [
          {
            id: {
              equals: id,
            },
          },
          {
            'tenant.slug': {
              equals: userTenant.tenant.slug,
            },
          },
        ],
      },
    })
    return response?.docs[0]
  })

export const deployTemplateAction = protectedClient
  .metadata({
    actionName: 'deployTemplateAction',
  })
  .schema(deployTemplateSchema)
  .action(async ({ clientInput, ctx }) => {
    const { id, projectId } = clientInput
    const {
      userTenant: { tenant },
    } = ctx
    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')

    const projectDetails = await payload.findByID({
      collection: 'projects',
      id: projectId,
    })

    const templateDetails = await payload.findByID({
      collection: 'templates',
      id,
    })

    const services = templateDetails?.services ?? []

    if (!services.length) {
      throw new Error('Please attach services to deploy the template')
    }

    const serviceNames = {} as Record<string, string>

    services.forEach(service => {
      const serviceName = handleGenerateName()

      if (service?.name) {
        serviceNames[service?.name] = `${projectDetails.name}-${serviceName}`
      }
    })

    // Step 1: update service names & reference variables name to unique
    const updatedServices = services.map(service => {
      const serviceName = serviceNames[`${service?.name}`]
      let variables = [] as Array<{
        key: string
        value: string
        id?: string | null
      }>

      service?.variables?.forEach(variable => {
        const match = variable.value.match(REFERENCE_VARIABLE_REGEX)

        if (match) {
          const [_referenceVariable, type, serviceName, value] = match
          const newServiceName = serviceNames[serviceName]

          if (newServiceName) {
            variables.push({
              ...variable,
              value: `$` + `{{${type}:${newServiceName}.${value}}}`,
            })
          } else {
            variables?.push(variable)
          }
        } else {
          variables?.push(variable)
        }
      })

      return { ...service, name: serviceName, variables }
    })

    let createdServices: Service[] = []

    // Step 2: map through services and create services in database
    for await (const service of updatedServices) {
      const { type, name } = service

      if (type === 'database' && service?.databaseDetails) {
        const serviceResponse = await payload.create({
          collection: 'services',
          data: {
            name: `${name}`,
            type,
            databaseDetails: {
              type: service.databaseDetails?.type,
              exposedPorts: service.databaseDetails?.exposedPorts ?? [],
            },
            project: projectDetails?.id,
            tenant,
          },
          depth: 10,
        })

        createdServices.push(serviceResponse)
      } else if (type === 'docker' && service?.dockerDetails) {
        const serviceResponse = await payload.create({
          collection: 'services',
          data: {
            name: `${name}`,
            type,
            dockerDetails: service?.dockerDetails,
            project: projectDetails?.id,
            variables: service?.variables,
            tenant,
          },
          depth: 10,
        })

        createdServices.push(serviceResponse)
      } else if (type === 'app') {
        // todo: handle all git-providers cases
        if (service?.providerType === 'github' && service?.githubSettings) {
          const serviceResponse = await payload.create({
            collection: 'services',
            data: {
              name: `${name}`,
              type,
              project: projectDetails?.id,
              variables: service?.variables,
              githubSettings: service?.githubSettings,
              providerType: service?.providerType,
              provider: service?.provider,
              builder: service?.builder,
              tenant,
            },
            depth: 10,
          })

          createdServices.push(serviceResponse)
        }
      }
    }

    // Step 3: trigger template-deploy queue with services
    const response = await addTemplateDeployQueue({
      services: createdServices,
    })

    if (response.id) {
      revalidatePath(`/${tenant.slug}/dashboard/project/${projectDetails.id}`)
      return { success: true }
    }
  })

export const updateTemplate = protectedClient
  .metadata({
    actionName: 'updateTemplate',
  })
  .schema(updateTemplateSchema)
  .action(async ({ clientInput }) => {
    const { id, name, services, description } = clientInput

    const response = await payload.update({
      collection: 'templates',
      where: {
        id: {
          equals: id,
        },
      },
      data: {
        name,
        description,
        services,
      },
    })
    return response
  })

export const getAllTemplatesAction = protectedClient
  .metadata({ actionName: 'getAllTemplatesAction' })
  .action(async ({ ctx }) => {
    const { userTenant } = ctx
    const { docs } = await payload.find({
      collection: 'templates',
      where: {
        'tenant.slug': {
          equals: userTenant.tenant.slug,
        },
      },
      pagination: false,
    })

    return docs
  })

export const deployTemplateFromArchitectureAction = protectedClient
  .metadata({
    actionName: 'deployTemplateFromArchitectureAction',
  })
  .schema(deployTemplateFromArchitectureSchema)
  .action(async ({ clientInput, ctx }) => {
    const {
      userTenant: { tenant },
    } = ctx
    const { projectId, services = [] } = clientInput

    const projectDetails = await payload.findByID({
      collection: 'projects',
      id: projectId,
    })

    if (!services.length) {
      throw new Error('Please attach services to deploy the template')
    }

    const serviceNames = {} as Record<string, string>

    services.forEach(service => {
      if (service?.name) {
        serviceNames[service?.name] = `${projectDetails.name}-${service.name}`
      }
    })

    // Step 1: update service names & reference variables name to unique
    const updatedServices = services.map(service => {
      const serviceName = serviceNames[`${service?.name}`]
      let variables = [] as Array<{
        key: string
        value: string
        id?: string | null
      }>

      service?.variables?.forEach(variable => {
        const match = variable.value.match(REFERENCE_VARIABLE_REGEX)

        if (match) {
          const [_referenceVariable, type, serviceName, value] = match
          const newServiceName = serviceNames[serviceName]

          if (newServiceName) {
            variables.push({
              ...variable,
              value: `$` + `{{${type}:${newServiceName}.${value}}}`,
            })
          } else {
            variables?.push(variable)
          }
        } else {
          variables?.push(variable)
        }
      })

      return { ...service, name: serviceName, variables }
    })

    let createdServices: Service[] = []

    // Step 2: map through services and create services in database
    for await (const service of updatedServices) {
      const { type, name } = service

      if (type === 'database' && service?.databaseDetails) {
        const serviceResponse = await payload.create({
          collection: 'services',
          data: {
            name: `${name}`,
            type,
            databaseDetails: {
              type: service.databaseDetails?.type,
              exposedPorts: service.databaseDetails?.exposedPorts ?? [],
            },
            project: projectDetails?.id,
            tenant,
          },
          depth: 10,
        })

        createdServices.push(serviceResponse)
      } else if (type === 'docker' && service?.dockerDetails) {
        const serviceResponse = await payload.create({
          collection: 'services',
          data: {
            name: `${name}`,
            type,
            dockerDetails: service?.dockerDetails,
            project: projectDetails?.id,
            variables: service?.variables,
            tenant,
          },
          depth: 10,
        })

        createdServices.push(serviceResponse)
      } else if (type === 'app') {
        // todo: handle all git-providers cases
        if (service?.providerType === 'github' && service?.githubSettings) {
          const serviceResponse = await payload.create({
            collection: 'services',
            data: {
              name: `${name}`,
              type,
              project: projectDetails?.id,
              variables: service?.variables,
              githubSettings: service?.githubSettings,
              providerType: service?.providerType,
              provider: service?.provider,
              builder: service?.builder,
              tenant,
            },
            depth: 10,
          })

          createdServices.push(serviceResponse)
        }
      }
    }

    // Step 3: trigger template-deploy queue with services
    const response = await addTemplateDeployQueue({
      services: createdServices,
    })

    if (response.id) {
      revalidatePath(`/${tenant.slug}/dashboard/project/${projectDetails.id}`)
      return { success: true }
    }
  })
