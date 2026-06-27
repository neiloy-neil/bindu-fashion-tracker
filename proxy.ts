import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/api/auth')

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/uploads')
  ) {
    return NextResponse.next()
  }

  const requestHeaders = new Headers(req.headers)
  requestHeaders.delete('x-user-role')
  requestHeaders.delete('x-user-id')
  requestHeaders.delete('x-user-branch-id')
  requestHeaders.delete('x-user-managed-branches')

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token && !isPublicRoute) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized', message: 'Authentication is required' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      )
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (token && isPublicRoute && pathname === '/login') {
    return NextResponse.redirect(new URL('/entries', req.url))
  }

  if (token) {
    const role = token.role as string

    // SUPER_ADMIN has full access to everything
    if (role === 'SUPER_ADMIN') {
      requestHeaders.set('x-user-id', String(token.id))
      requestHeaders.set('x-user-role', role)
      if (token.username) {
        requestHeaders.set('x-user-username', String(token.username))
      }
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }

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
            JSON.stringify({ error: 'Forbidden', message: 'Admin access required' }),
            { status: 403, headers: { 'content-type': 'application/json' } }
          )
        }
        return NextResponse.redirect(new URL('/entries/new', req.url))
      }
    }

    if (role === 'AUDITOR' || role === 'AREA_MANAGER' || role === 'ACCOUNTS') {
      if (
        pathname.startsWith('/admin/users') ||
        pathname.startsWith('/admin/settings') ||
        pathname.startsWith('/branches') ||
        pathname.startsWith('/import')
      ) {
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ error: 'Forbidden', message: 'Admin access required' }),
            { status: 403, headers: { 'content-type': 'application/json' } }
          )
        }
        return NextResponse.redirect(new URL('/entries', req.url))
      }
    }

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
            JSON.stringify({ error: 'Forbidden', message: 'HR Admin cannot access this resource' }),
            { status: 403, headers: { 'content-type': 'application/json' } }
          )
        }
        return NextResponse.redirect(new URL('/entries', req.url))
      }
    }

    requestHeaders.set('x-user-id', String(token.id))
    requestHeaders.set('x-user-role', role)
    if (token.username) {
      requestHeaders.set('x-user-username', String(token.username))
    }
    if (token.employeeId) {
      requestHeaders.set('x-user-employee-id', String(token.employeeId))
    }
    if (token.branchId) {
      requestHeaders.set('x-user-branch-id', String(token.branchId))
    }
    if (token.managedBranchIds && Array.isArray(token.managedBranchIds)) {
      requestHeaders.set('x-user-managed-branches', token.managedBranchIds.join(','))
      requestHeaders.set('x-user-managed-branch-ids', JSON.stringify(token.managedBranchIds))
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
