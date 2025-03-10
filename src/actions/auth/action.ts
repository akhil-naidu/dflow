import { env } from 'env'
import { redirect } from 'next/navigation'

export const githubAuthorize = async () => {
  redirect(
    `https://github.com/login/oauth/authorize?client_id=${env.NEXT_PUBLIC_GITHUB_CLIENT_ID}&scope=read:user`,
  )
}
