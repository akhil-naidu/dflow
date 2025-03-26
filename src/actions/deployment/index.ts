'use server'

import { protectedClient } from '@/lib/safe-action'

import { triggerDeployment } from './deploy'
import { createDeploymentSchema } from './validator'

// No need to handle try/catch that abstraction is taken care by next-safe-actions
export const createDeploymentAction = protectedClient
  .metadata({
    // This action name can be used for sentry tracking
    actionName: 'createDeploymentAction',
  })
  .schema(createDeploymentSchema)
  .action(async ({ clientInput }) => {
    const { serviceId, projectId } = clientInput

    const deploymentQueueId = await triggerDeployment({ serviceId })

    if (deploymentQueueId) {
      return {
        success: true,
        redirectURL: `/dashboard/project/${projectId}/service/${serviceId}?tab=deployments`,
      }
    }
  })
