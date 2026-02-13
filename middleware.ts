import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isAdminCookie = request.cookies.get('is_admin');
  const isAdmin = isAdminCookie?.value === 'true';

  if (!isAdmin) {
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
     * - login (the login page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|uploads|login).*)',
  ],
};
