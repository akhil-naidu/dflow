import { APIError, PayloadHandler } from 'payload'

import { databaseUpdateSchema } from './validator'

export const databaseUpdate: PayloadHandler = async ({
  headers,
  payload,
  json,
}) => {
  const auth = await payload.auth({ headers })

  // Throwing 401 if now user is present
  if (!auth.user) {
    throw new APIError('Unauthenticated', 401)
  }

  const data = json ? await json() : {}

  // Doing zod validation
  const { data: validatedData, success } = databaseUpdateSchema.safeParse(data)

  if (success) {
    switch (validatedData.type) {
      // Updating the database details after database creation
      case 'database.update':
        const { serviceId: dbServiceId, ...databaseDetails } =
          validatedData.data

        const databaseUpdateResponse = await payload.update({
          collection: 'services',
          id: dbServiceId,
          data: {
            databaseDetails,
          },
        })

        return Response.json({
          data: databaseUpdateResponse,
        })

      // Updating the plugins details of a server
      case 'plugin.update':
        const { serverId, plugins } = validatedData.data

        const pluginUpdateResponse = await payload.update({
          collection: 'servers',
          id: serverId,
          data: {
            plugins,
          },
        })

        return Response.json({
          data: pluginUpdateResponse,
        })

      case 'domain.update':
        const { serviceId: domainServiceId, domain } = validatedData.data
        const { operation, domain: newDomain } = domain

        // Fetching all domains of particular domain
        const { domains: servicePreviousDomains } = await payload.findByID({
          id: domainServiceId,
          collection: 'services',
        })

        const previousDomains = servicePreviousDomains ?? []
        let updatedDomains = servicePreviousDomains ?? []

        if (operation === 'remove') {
          // In remove case removing that particular domain
          updatedDomains = previousDomains.filter(
            domainDetails => domainDetails.domain !== newDomain,
          )
        } else if (operation === 'set') {
          updatedDomains = [
            {
              // here in update case typecasting domain as string
              domain: newDomain as string,
              default: true,
              autoRegenerateSSL: domain.autoRegenerateSSL,
              certificateType: domain.certificateType,
            },
          ]
        } else {
          // in add case directly adding domain
          const newDomainList =
            typeof newDomain === 'string' ? [newDomain] : newDomain
          const newDomainsFilteredList = newDomainList?.filter(domainName => {
            return !previousDomains.some(
              previousDomain => previousDomain.domain === domainName,
            )
          })

          console.log({ newDomainsFilteredList, updatedDomains, newDomain })

          if (newDomainsFilteredList.length) {
            updatedDomains = [
              ...previousDomains,
              ...newDomainsFilteredList.map(domainName => {
                return {
                  domain: domainName,
                  default: false,
                  // todo: need to add these parameters dynamically
                  autoRegenerateSSL: domain.autoRegenerateSSL,
                  certificateType: domain.certificateType,
                }
              }),
            ]
          }
        }

        const updatedServiceDomainResponse = await payload.update({
          id: domainServiceId,
          data: {
            domains: updatedDomains,
          },
          collection: 'services',
          depth: 10,
        })

        return Response.json({
          data: updatedServiceDomainResponse,
        })

      case 'deployment.update':
        const { deployment } = validatedData.data

        const deploymentResponse = await payload.update({
          collection: 'deployments',
          data: {
            status: deployment.status,
            logs: deployment.logs,
          },
          id: deployment.id,
        })

        return Response.json({
          data: deploymentResponse,
        })
    }
  }

  return Response.json({
    message: 'event not found!',
  })
}
