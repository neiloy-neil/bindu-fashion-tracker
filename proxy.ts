import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/api/auth')

  // Let Next.js static assets and API pass except for protected API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images')
  ) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const session = token

  // Redirect to login if not authenticated and trying to access protected route
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Redirect to entries if already authenticated and trying to access login
  if (session && isPublicRoute && pathname === '/login') {
    return NextResponse.redirect(new URL('/entries', req.url))
  }

  // RBAC checks
  if (session) {
    const role = session.role as string
    
    // Branch user trying to access admin pages
    if (role === 'BRANCH') {
      if (
        pathname.startsWith('/branches') ||
        pathname.startsWith('/import') ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/parties') ||
        pathname.startsWith('/categories') ||
        pathname.startsWith('/api/admin') ||
        pathname.startsWith('/api/parties') ||
        pathname.startsWith('/api/categories')
      ) {
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ error: "Unauthorized - Admin access required" }), 
            { status: 401, headers: { 'content-type': 'application/json' } }
          );
        }
        return NextResponse.redirect(new URL('/entries/new', req.url))
      }
    }

    // AUDITOR / AREA_MANAGER trying to access strictly ADMIN pages
    if (role === 'AUDITOR' || role === 'AREA_MANAGER') {
      if (
        pathname.startsWith('/admin/users') ||
        pathname.startsWith('/admin/settings') ||
        pathname.startsWith('/branches') ||
        pathname.startsWith('/import')
      ) {
        return NextResponse.redirect(new URL('/entries', req.url))
      }
    }

    // Set user headers for API routes
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-user-id', String(session.id))
    requestHeaders.set('x-user-role', role)
    if (session.branchId) {
      requestHeaders.set('x-user-branch-id', String(session.branchId))
    }
    if (session.managedBranchIds && Array.isArray(session.managedBranchIds)) {
      requestHeaders.set('x-user-managed-branches', session.managedBranchIds.join(','))
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
