import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  
  const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth')
  const isApiRoute = req.nextUrl.pathname.startsWith('/api')
  const isLoginRoute = req.nextUrl.pathname === '/login'

  // Let NextAuth handle its own routes
  if (isApiAuthRoute) {
    return NextResponse.next()
  }

  // Handle API routes protection and header injection
  if (isApiRoute) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestHeaders = new Headers(req.headers)
    
    requestHeaders.set('x-user-role', String(token.role))
    requestHeaders.set('x-user-id', String(token.id))
    requestHeaders.set('x-user-branch-id', String(token.branchId ?? ''))
    requestHeaders.set('x-user-username', String(token.username ?? ''))
    requestHeaders.set('x-user-employee-id', String(token.employeeId ?? ''))
    requestHeaders.set('x-user-managed-branch-ids', JSON.stringify(token.managedBranchIds ?? []))

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // Handle page routes protection
  if (!isLoginRoute) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  } else {
    // If user is on /login but already has a token, redirect to home
    if (token) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|bindu-logo.webp|public).*)'],
}
