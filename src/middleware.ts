import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const token = request.cookies.get("token")?.value

    // Skip middleware for API routes and static assets
    if (
        pathname.startsWith("/api/") ||
        pathname.includes("/api/proxy/") ||
        pathname.startsWith("/_next/") ||
        pathname.includes(".")
    ) {
        return NextResponse.next()
    }

    // Handle admin routes (protected)
    if (pathname.startsWith("/admin")) {
        if (!token) {
            const url = new URL("/", request.url)
            url.searchParams.set("redirect", pathname)
            return NextResponse.redirect(url)
        }
        return NextResponse.next()
    }

    // Handle root route (login page)
    if (pathname === "/" && token) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url))
    }

    return NextResponse.next()
}

// Configure which routes the middleware should run on
export const config = {
    matcher: [
        /*
         * Match all request paths except for specific exclusions
         */
        "/((?!_next/static|_next/image|favicon.ico|public).*)",
    ],
}
