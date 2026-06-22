import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/api/auth')

  // Let Next.js static assets and API pass except for protected API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/uploads')
  ) {
    return NextResponse.next()
  }

  // 1. SANITIZE HEADERS: Prevent spoofing by aggressively deleting any incoming x-user-* headers
  const requestHeaders = new Headers(req.headers)
  requestHeaders.delete('x-user-role')
  requestHeaders.delete('x-user-id')
  requestHeaders.delete('x-user-branch-id')
  requestHeaders.delete('x-user-managed-branches')

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // 2. UNAUTHENTICATED USERS: Redirect to login or return 401
  if (!token && !isPublicRoute) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized", message: "Authentication is required" }), 
        { status: 401, headers: { 'content-type': 'application/json' } }
      )
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 3. AUTHENTICATED USERS: Prevent accessing login page
  if (token && isPublicRoute && pathname === '/login') {
    return NextResponse.redirect(new URL('/entries', req.url))
  }

  // 4. RBAC ENFORCEMENT & HEADER INJECTION
  if (token) {
    const role = token.role as string
    
    // Check if BRANCH user is trying to access admin pages
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
            JSON.stringify({ error: "Forbidden", message: "Admin access required" }), 
            { status: 403, headers: { 'content-type': 'application/json' } }
          )
        }
        return NextResponse.redirect(new URL('/entries/new', req.url))
      }
    }

    // Check if AUDITOR / AREA_MANAGER is trying to access STRICTLY ADMIN pages
    if (role === 'AUDITOR' || role === 'AREA_MANAGER') {
      if (
        pathname.startsWith('/admin/users') ||
        pathname.startsWith('/admin/settings') ||
        pathname.startsWith('/branches') ||
        pathname.startsWith('/import')
      ) {
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ error: "Forbidden", message: "Admin access required" }), 
            { status: 403, headers: { 'content-type': 'application/json' } }
          )
        }
        return NextResponse.redirect(new URL('/entries', req.url))
      }
    }

    // Check if HR_ADMIN is trying to access restricted pages
    if (role === 'HR_ADMIN') {
      if (
        pathname.startsWith('/entries/new') ||
        pathname.startsWith('/admin/users') ||
        pathname.startsWith('/admin/settings') ||
        pathname.startsWith('/branches') ||
        pathname.startsWith('/import') ||
        pathname.startsWith('/parties') ||
        pathname.startsWith('/categories')
      ) {
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ error: "Forbidden", message: "HR Admin cannot access this resource" }), 
            { status: 403, headers: { 'content-type': 'application/json' } }
          )
        }
        return NextResponse.redirect(new URL('/entries', req.url))
      }
    }

    // INJECT VERIFIED HEADERS
    requestHeaders.set('x-user-id', String(token.id))
    requestHeaders.set('x-user-role', role)
    if (token.branchId) {
      requestHeaders.set('x-user-branch-id', String(token.branchId))
    }
    if (token.managedBranchIds && Array.isArray(token.managedBranchIds)) {
      requestHeaders.set('x-user-managed-branches', token.managedBranchIds.join(','))
    }

    // Proceed with the sanitized and injected headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  // Match all routes except standard static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
