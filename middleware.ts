import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isAdminCookie = request.cookies.get('is_admin');
  const isAdmin = isAdminCookie?.value === 'true';
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');

  // If logged in and trying to access login page, redirect to home
  if (isAdmin && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If not logged in and not on the login page, redirect to login
  if (!isAdmin && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
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
     * - uploads (uploaded media)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|uploads).*)',
  ],
};
