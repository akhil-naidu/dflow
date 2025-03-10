import { getUserByEmail } from '../utils/data-access'
import { env } from 'env'
import { Endpoint, PayloadRequest } from 'payload'

import { loginWith } from '@/lib/auth'

export const githubAuthCallbackpoint: Endpoint = {
  path: '/auth/github/callback',
  method: 'get',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const code = req.query.code

    const tokenRes = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      },
    )

    console.log('token response is ', tokenRes)

    if (!tokenRes.ok) {
      // return to login page.
      return Response.redirect('')
    }

    const body = await tokenRes.json()

    const { access_token } = body

    if (!access_token) {
      return Response.redirect('')
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    console.log('user response is ', userRes)

    const githubUser = await userRes.json()

    console.log('github user is ', githubUser)

    if (!githubUser || !githubUser.email) {
      console.log('!githubUser is ', !githubUser)
      console.log('!githubUser.email is ', !githubUser.email)
      console.log('redirect triggered in line 57')
      return Response.redirect(
        new URL('/dashboard', env.NEXT_PUBLIC_WEBSITE_URL),
      )
    }

    const user = await getUserByEmail({
      email: githubUser.email,
      password: githubUser.password,
    })

    console.log('user is ', user)

    try {
      await loginWith(user)
    } catch (error) {
      console.log('error is ', error)
    }

    console.log('redirect triggered before final return')
    return Response.redirect('/dashboard')
  },
}
