import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // This middleware is disabled. Authentication is now handled on the client-side.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match no paths, as middleware is disabled.
     */
  ],
};
