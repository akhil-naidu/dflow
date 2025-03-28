import configPromise from '@payload-config'
import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'
import { Octokit } from 'octokit'
import { getPayload } from 'payload'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const headers = request.headers

  const payload = await getPayload({ config: configPromise })

  const code = searchParams.get('code') ?? ''
  const installation_id = searchParams.get('installation_id') ?? ''
  const onboarding = searchParams.get('onboarding') ?? ''
  const state = searchParams.get('state') ?? ''

  if (!state) {
    return NextResponse.json(
      {
        message: 'Invalid request!',
      },
      {
        status: 400,
      },
    )
  }

  const [action, id, installationOnboarding] = state.split(':')

  if (action === 'gh_init') {
    const octokit = new Octokit({})
    const { data } = await octokit.request(
      'POST /app-manifests/{code}/conversions',
      {
        code: code as string,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )

    await payload.create({
      collection: 'gitProviders',
      data: {
        type: 'github',
        github: {
          appId: data.id,
          appName: data.name,
          appUrl: data.html_url,
          clientId: data.client_id,
          clientSecret: data.client_secret,
          webhookSecret: data.webhook_secret ?? '',
          privateKey: data.pem,
        },
      },
    })
  } else if (action === 'gh_install') {
    await payload.update({
      collection: 'gitProviders',
      id,
      data: {
        github: {
          installationId: installation_id,
        },
      },
    })

    const { user } = await payload.auth({ headers })

    // After successful of github-app making user as onboarded
    if (user?.id && user?.onboarded === false) {
      await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          onboarded: true,
        },
      })

      if (installationOnboarding === 'onboarding') {
        redirect('/dashboard')
      }
    }
  }

  if (onboarding === 'true') {
    redirect('/onboarding/install-github')
  }

  return redirect(`/integrations/?action=${action}&active=github`)
}
