import { Logger } from '@logtail/next'
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'

import { DFLOW_CONFIG } from './lib/constants'

export function middleware(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname
  const hostname = request.headers.get('host') || ''
  const segments = pathname.split('/') // ['', 'acme', 'dashboard']

  const logger = new Logger({ source: 'middleware' })
  await logger.middleware(request, { logRequestDetails: ['body', 'nextUrl'] })

  // Check if domain is app.dflow.sh and redirect auth pages
  if (hostname === 'app.dflow.sh') {
    if (pathname === '/sign-in') {
      return NextResponse.redirect(`${DFLOW_CONFIG.URL}/sign-in`)
    }

    if (pathname === '/sign-up') {
      return NextResponse.redirect(`${DFLOW_CONFIG.URL}/sign-up`)
    }

    // Check for auth pages within organization paths
    if (segments.length >= 3) {
      const lastSegment = segments[segments.length - 1]
      if (lastSegment === 'sign-in') {
        return NextResponse.redirect(`${DFLOW_CONFIG.URL}/sign-in`)
      }
      if (lastSegment === 'sign-up') {
        return NextResponse.redirect(`${DFLOW_CONFIG.URL}/sign-up`)
      }
    }
  }

  const organisation = segments[1]
  const hasSubPath = segments.length > 2 // ensure there's something after /[organisation]

  const response = NextResponse.next()

  if (
    organisation &&
    hasSubPath &&
    ![
      '_next',
      'favicon.ico',
      '.well-known',
      'api',
      '_static',
      '_vercel',
      'images',
      'payload-admin',
      'sign-in', // to avoid setting org cookie for auth pages
      'sign-up',
    ].includes(organisation)
  ) {
    response.cookies.set('organisation', organisation, {
      path: '/',
    })
  }

  event.waitUntil(logger.flush())

  return response
}

export const config = {
  matcher: [
    '/((?!api/|payload-admin/|_next/|_static/|_vercel/|\\.well-known/|[\\w-]+\\.\\w+).*)',
  ],
}
