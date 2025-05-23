import { type NextRequest, NextResponse } from "next/server"
import { API_BASE_URL } from "@/lib/constants"

async function constructUrl(path: string, searchParams?: URLSearchParams): Promise<string> {
  // Special handling for login endpoint
  if (path === "login") {
    return `${API_BASE_URL}/api/login`
  }

  // Construct base URL
  let url = `${API_BASE_URL}/api/${path}`

  // Add search params if present
  if (searchParams?.toString()) {
    url += `?${searchParams.toString()}`
  }

  return url
}

async function forwardRequest(request: NextRequest, params: { path: string[] }) {
  try {
    const headers = new Headers()
    headers.set("Content-Type", "application/json")
    headers.set("Accept", "application/json")

    // Always get token from cookie for authenticated endpoints
    const token = request.cookies.get("token")
    if (token) {
      headers.set("authorization", `Bearer ${token.value}`)
    }

    // Get path and search params
    const pathString = params.path.join("/")
    const searchParams = request.nextUrl.searchParams
    const url = await constructUrl(pathString, searchParams)

    console.log(`Forwarding ${request.method} request to: ${url}`)

    const options: RequestInit = {
      method: request.method,
      headers,
      cache: "no-store",
    }

    // Handle request body for non-GET requests
    if (!["GET", "HEAD"].includes(request.method)) {
      try {
        const body = await request.json()
        options.body = JSON.stringify(body)
      } catch (error) {
        console.error("Error parsing request body:", error)
      }
    }

    const response = await fetch(url, options)

    // Create response headers
    const responseHeaders = new Headers()
    responseHeaders.set("Content-Type", "application/json")

    // Skip JSON parsing for HEAD requests as they don't return body content
    if (request.method === "HEAD") {
      return NextResponse.json(
          { success: response.ok },
          {
            status: response.status,
            headers: responseHeaders,
          },
      )
    }

    // Check if response is 401 - we need to handle authentication failures
    if (response.status === 401) {
      const errorData = { message: "Unauthenticated.", status: 401 }
      console.log("Response data:", { status: response.status, data: errorData })

      // Set a special header to indicate authentication failure
      responseHeaders.set("X-Auth-Failed", "true")

      return NextResponse.json(errorData, {
        status: 401,
        headers: responseHeaders,
      })
    }

    // Try to parse JSON response, but handle non-JSON responses gracefully
    let data
    try {
      // Clone the response before trying to parse it
      const clonedResponse = response.clone()
      data = await clonedResponse.json()
      console.log("Response data:", { status: response.status, data: data })
    } catch (error) {
      console.warn("Non-JSON response from server:", error)

      // For non-JSON responses, create a generic response object
      data = {
        success: response.ok,
        status: response.status,
        message: response.ok ? "Request successful" : "Request failed",
      }
    }

    if (!response.ok) {
      console.error("Proxy error response:", {
        status: response.status,
        url,
        data,
        method: request.method,
      })
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error("Proxy error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, context: { params: any }) {
  // Handle params correctly in App Router
  const params = await Promise.resolve(context.params)
  return forwardRequest(request, params)
}

export async function POST(request: NextRequest, context: { params: any }) {
  // Handle params correctly in App Router
  const params = await Promise.resolve(context.params)
  return forwardRequest(request, params)
}

export async function PUT(request: NextRequest, context: { params: any }) {
  // Handle params correctly in App Router
  const params = await Promise.resolve(context.params)
  return forwardRequest(request, params)
}

export async function DELETE(request: NextRequest, context: { params: any }) {
  // Handle params correctly in App Router
  const params = await Promise.resolve(context.params)
  return forwardRequest(request, params)
}

export async function HEAD(request: NextRequest, context: { params: any }) {
  // Handle params correctly in App Router
  const params = await Promise.resolve(context.params)
  return forwardRequest(request, params)
}
