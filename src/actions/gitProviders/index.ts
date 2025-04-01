'use server'

import { createAppAuth } from '@octokit/auth-app'
import configPromise from '@payload-config'
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
  .action(async ({ clientInput }) => {
    const { id } = clientInput

    const response = await payload.delete({
      collection: 'gitProviders',
      id,
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
    const { appId, installationId, privateKey, limit = 10 } = clientInput

    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId,
        privateKey,
        installationId,
      },
    })

    let hasMore = true
    let currentPage = 1

    while (hasMore) {
      const { data } =
        await octokit.rest.apps.listReposAccessibleToInstallation({
          per_page: limit,
          page: currentPage,
        })

      if (data.repositories.length < limit) {
        hasMore = false
      }

      currentPage++
    }

    const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
      per_page: limit,
    })

    return {
      repositories: data.repositories,
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
  .action(async () => {
    const { docs } = await payload.find({
      collection: 'gitProviders',
      pagination: false,
      select: {
        github: {
          appName: true,
          installationId: true,
          appUrl: true,
        },
        createdAt: true,
        type: true,
        updatedAt: true,
      },
    })

    return docs
  })
