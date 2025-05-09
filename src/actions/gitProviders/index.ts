'use server'

import { createAppAuth } from '@octokit/auth-app'
import configPromise from '@payload-config'
import { revalidatePath } from 'next/cache'
import { Octokit } from 'octokit'
import { getPayload } from 'payload'

import { protectedClient } from '@/lib/safe-action'

import {
  deleteGitProviderSchema,
  getBranchesSchema,
  getRepositorySchema,
} from './validator'

const payload = await getPayload({ config: configPromise })

export const deleteGitProviderAction = protectedClient
  .metadata({
    actionName: 'deleteGitProviderAction',
  })
  .schema(deleteGitProviderSchema)
  .action(async ({ clientInput, ctx }) => {
    const { id } = clientInput
    const { userTenant } = ctx
    const response = await payload.delete({
      collection: 'gitProviders',
      where: {
        and: [
          {
            id: {
              equals: id,
            },
          },
          {
            'tenant.slug': {
              equals: userTenant.tenant?.slug,
            },
          },
        ],
      },
    })

    if (response) {
      return { success: true }
    }
  })

export const getRepositoriesAction = protectedClient
  .metadata({
    actionName: 'getRepositoriesAction',
  })
  .schema(getRepositorySchema)
  .action(async ({ clientInput }) => {
    const { appId, installationId, privateKey } = clientInput

    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId,
        privateKey,
        installationId,
      },
    })

    let allRepositories: any[] = []
    let currentPage = 1
    let hasMore = true

    while (hasMore) {
      const { data } =
        await octokit.rest.apps.listReposAccessibleToInstallation({
          per_page: 100,
          page: currentPage,
        })

      allRepositories = [...allRepositories, ...data.repositories]

      if (data.repositories.length < 100) {
        hasMore = false
      } else {
        currentPage++
      }
    }

    return {
      repositories: allRepositories.reverse(),
    }
  })

export const getBranchesAction = protectedClient
  .metadata({
    actionName: 'getBranchesAction',
  })
  .schema(getBranchesSchema)
  .action(async ({ clientInput }) => {
    const {
      page = 1,
      appId,
      installationId,
      privateKey,
      limit = 100,
      owner,
      repository,
    } = clientInput

    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId,
        privateKey,
        installationId,
      },
    })

    const { data: branches } = await octokit.rest.repos.listBranches({
      owner,
      repo: repository,
      page,
      per_page: limit,
    })

    return {
      branches,
    }
  })

export const getAllAppsAction = protectedClient
  .metadata({
    actionName: 'getAllAppsAction',
  })
  .action(async ({ ctx }) => {
    const { userTenant } = ctx
    const { docs } = await payload.find({
      collection: 'gitProviders',
      pagination: false,
      where: {
        'tenant.slug': {
          equals: userTenant.tenant.slug,
        },
      },
    })

    return docs
  })

export const skipOnboardingAction = protectedClient
  .metadata({
    actionName: 'skipOnboardingAction',
  })
  .action(async ({ ctx }) => {
    const { user } = ctx

    if (user?.id) {
      await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          onboarded: true,
        },
      })
    }

    revalidatePath('/onboarding/install-github')

    return { success: true }
  })
