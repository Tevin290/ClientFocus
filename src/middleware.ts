import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Role-based route protection
const roleRoutes = {
  '/admin/billing': ['super-admin'],
  '/admin/dashboard': ['admin', 'super-admin'],
  '/admin/sessions': ['admin', 'super-admin'],
  '/admin/coaches': ['admin', 'super-admin'],
  '/admin/settings': ['admin', 'super-admin'],
  '/coach': ['coach'],
  '/client': ['client'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes and Next.js internals
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Handle company-specific routes 
  const companySlugMatch = pathname.match(/^\/([a-z0-9-]+)(?:\/(login|signup))?$/);
  if (companySlugMatch) {
    const [, companySlug, action] = companySlugMatch;
    // Allow company-specific pages (landing, login, signup)
    const response = NextResponse.next();
    response.headers.set('x-company-slug', companySlug);
    if (action) {
      response.headers.set('x-company-auth-page', action);
    } else {
      response.headers.set('x-company-landing', 'true');
    }
    return response;
  }

  // Handle root routes
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') {
    return NextResponse.next();
  }

  // Check if route requires specific role
  for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(route)) {
      const response = NextResponse.next();
      response.headers.set('x-required-roles', allowedRoles.join(','));
      response.headers.set('x-protected-route', 'true');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};