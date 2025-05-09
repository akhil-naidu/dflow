'use server'

import { cookies } from 'next/headers'

export async function setCookieAction(organisationSlug: string) {
  const cookieStore = await cookies()
  cookieStore.set('organisation', organisationSlug, {
    path: '/',
    // maxAge: 60 * 60 * 24, // 1 day
  })
}
