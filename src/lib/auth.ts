import type { User } from "@/types/user"

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  success: boolean
  message: string
  code: number
  data: {
    token: string
    user: User
    device_id?: string
  }
}

// Generate a unique device identifier
const generateDeviceId = (): string => {
  // Create a combination of browser info, screen size, and random values
  const browserInfo = navigator.userAgent
  const screenInfo = `${window.screen.width}x${window.screen.height}`
  const randomPart = Math.random().toString(36).substring(2, 15)
  const timestamp = Date.now().toString(36)

  // Combine and hash using simple string operations (for demonstration)
  const combinedInfo = `${browserInfo}_${screenInfo}_${randomPart}_${timestamp}`

  // Create a simple hash (for demonstration only - consider more robust hashing in production)
  let hash = 0
  for (let i = 0; i < combinedInfo.length; i++) {
    const char = combinedInfo.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  // Return a hexadecimal string version of the hash + random part for uniqueness
  return Math.abs(hash).toString(16) + randomPart
}

// Device session management
const getDeviceId = (): string => {
  if (typeof window === "undefined") return ""

  let deviceId = localStorage.getItem("device_id")
  if (!deviceId) {
    deviceId = generateDeviceId()
    localStorage.setItem("device_id", deviceId)
  }
  return deviceId
}

// Helper function to set cookies
const setCookie = (name: string, value: string, days = 7) => {
  if (typeof window === "undefined") return
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
}

// Helper function to get cookies
const getCookie = (name: string): string | null => {
  if (typeof window === "undefined") return null
  const nameEQ = name + "="
  const ca = document.cookie.split(";")
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === " ") c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

// Store user data in localStorage (including roles and permissions)
const storeUserData = (user: User) => {
  if (typeof window === "undefined") return
  try {
    console.log("Storing user data:", user)

    // Store basic user info
    localStorage.setItem("user_id", String(user.id))
    localStorage.setItem("user_name", `${user.first_name} ${user.last_name}`)
    localStorage.setItem("user_email", user.email)
    localStorage.setItem("user_type", user.type)

    // Store company ID - check multiple possible locations
    let companyId: number | null = null

    if (user.company_id) {
      companyId = user.company_id
    } else if (user.company?.id) {
      companyId = user.company.id
    }

    if (companyId) {
      localStorage.setItem("user_company_id", String(companyId))
      console.log("Stored company ID:", companyId)
    } else {
      console.warn("No company ID found in user data")
    }

    // Store roles and permissions
    if (user.roles && user.roles.length > 0) {
      // Store role names
      const roleNames = user.roles.map((role) => role.name)
      localStorage.setItem("user_roles", JSON.stringify(roleNames))
      console.log("Stored roles:", roleNames)

      // Store all permissions from all roles
      const allPermissions = new Set<string>()
      user.roles.forEach((role) => {
        if (role.permissions) {
          role.permissions.forEach((permission) => {
            allPermissions.add(permission.name)
          })
        }
      })
      localStorage.setItem("user_permissions", JSON.stringify(Array.from(allPermissions)))
      console.log("Stored permissions:", Array.from(allPermissions).length)
    }
  } catch (error) {
    console.error("Error storing user data:", error)
  }
}

// Clear user data from localStorage
const clearUserData = () => {
  if (typeof window === "undefined") return
  localStorage.removeItem("user_id")
  localStorage.removeItem("user_name")
  localStorage.removeItem("user_email")
  localStorage.removeItem("user_type")
  localStorage.removeItem("user_roles")
  localStorage.removeItem("user_permissions")
  localStorage.removeItem("user_company_id")
  // Don't remove device_id as it should persist across logins
}

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  // Get device ID for this device
  const deviceId = getDeviceId()

  const response = await fetch(`/api/proxy/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-ID": deviceId, // Pass device ID in headers
    },
    body: JSON.stringify({
      ...credentials,
      device_id: deviceId, // Also include in body
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()

    // Handle specific case where user has too many active devices
    if (response.status === 403 && errorData.code === "MAX_DEVICES_REACHED") {
      throw new Error(
          "You are already logged in on two devices. Please log out from one device before logging in again.",
      )
    }

    throw new Error(errorData.message || "Login failed")
  }

  const data = (await response.json()) as AuthResponse
  if (data.success) {
    console.log("Login successful, storing user data:", data.data.user)

    // Set cookies
    setCookie("token", data.data.token)
    setCookie("user_role", data.data.user.type)
    setCookie("user_email", data.data.user.email)

    // Store user data including roles and permissions
    storeUserData(data.data.user)

    // Store the device ID if returned by server (fallback to local one if not)
    const serverDeviceId = data.data.device_id || deviceId
    localStorage.setItem("device_id", serverDeviceId)
  }
  return data
}

export const logout = async () => {
  const deviceId = getDeviceId()
  const token = getToken()

  // Send logout request to server to invalidate this device session
  if (token) {
    try {
      await fetch("/api/proxy/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Device-ID": deviceId,
        },
        body: JSON.stringify({ device_id: deviceId }),
      })
    } catch (error) {
      console.error("Error during logout:", error)
      // Continue with local logout even if server logout fails
    }
  }

  // Clear cookies
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
  document.cookie = "user_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
  document.cookie = "user_email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
  // Clear localStorage data
  clearUserData()
  // Redirect to login
  window.location.href = "/"
}

export const getToken = (): string | null => {
  return getCookie("token")
}

export const getUserRole = (): string | null => {
  return getCookie("user_role")
}

// Get all roles assigned to the user
export const getUserRoles = (): string[] => {
  if (typeof window === "undefined") return []
  try {
    const rolesJson = localStorage.getItem("user_roles")
    if (rolesJson) {
      return JSON.parse(rolesJson)
    }
  } catch (error) {
    console.error("Error parsing user roles:", error)
  }
  return []
}

// Get all permissions assigned to the user
export const getUserPermissions = (): string[] => {
  if (typeof window === "undefined") return []
  try {
    const permissionsJson = localStorage.getItem("user_permissions")
    if (permissionsJson) {
      return JSON.parse(permissionsJson)
    }
  } catch (error) {
    console.error("Error parsing user permissions:", error)
  }
  return []
}

// Check if user has a specific role
export const hasRole = (roleName: string): boolean => {
  const roles = getUserRoles()
  return roles.includes(roleName)
}

// Check if user has a specific permission
export const hasPermission = (permissionName: string): boolean => {
  const permissions = getUserPermissions()
  return permissions.includes(permissionName)
}

// Check if user has any of the specified permissions
export const hasAnyPermission = (permissionNames: string[]): boolean => {
  const permissions = getUserPermissions()
  return permissionNames.some((permission) => permissions.includes(permission))
}

// Check if user has all of the specified permissions
export const hasAllPermissions = (permissionNames: string[]): boolean => {
  const permissions = getUserPermissions()
  return permissionNames.every((permission) => permissions.includes(permission))
}

// Function to check if token is valid by making a lightweight API call
export const validateToken = async (): Promise<boolean> => {
  const token = getToken()
  if (!token) {
    console.log("No token found, user is not logged in")
    return false
  }

  try {
    // Instead of a dedicated validation endpoint, we'll use any existing API endpoint
    // that requires authentication. The API call itself doesn't matter as we only care
    // about detecting 401 responses, which will be handled by our fetch interceptor.
    const response = await fetch("/api/proxy/companies", {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Device-ID": getDeviceId(), // Include device ID with validation requests
      },
    })

    // The fetch interceptor will handle 401 responses and trigger logout
    // This function just needs to return whether we have a valid token
    return response.status !== 401
  } catch (error) {
    console.error("Error checking authentication status:", error)
    // On network errors, don't log out automatically
    return true
  }
}

// Function to set up token validation check
export const setupTokenValidation = () => {
  // Set up event listener for API responses
  const originalFetch = window.fetch
  window.fetch = async (input, init) => {
    // Add device ID header to all authenticated requests
    if (init && getToken()) {
      init.headers = {
        ...init.headers,
        "X-Device-ID": getDeviceId(),
      }
    }

    try {
      const response = await originalFetch(input, init)

      // Check ALL responses for 401 status
      if (response.status === 401) {
        // Don't handle 401 for login attempts and public endpoints
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
        const isLoginEndpoint = url.includes("/api/proxy/login") || url.includes("/api/proxy/public/")

        if (!isLoginEndpoint) {
          console.log("Authentication failed (401 response), logging out user")
          logout()
        }
      }

      // Check for device limit errors (403 with specific message)
      if (response.status === 403) {
        const clonedResponse = response.clone()
        try {
          const data = await clonedResponse.json()
          if (data.code === "MAX_DEVICES_REACHED" || (data.message && data.message.includes("device"))) {
            console.log("Maximum device limit reached, logging out from this device")
            alert(
                "You have been logged out because you logged in on another device. Only two devices are allowed at the same time.",
            )
            logout()
          }
        } catch (error) {
          // If we can't parse JSON, just continue
        }
      }

      return response
    } catch (error) {
      // For network errors, don't log out automatically
      console.error("Fetch error:", error)
      throw error
    }
  }

  // Check token validity after initial load
  setTimeout(() => {
    const token = getToken()
    if (token) {
      // Make a simple API call to any authenticated endpoint
      // to trigger authentication check (will get 401 if invalid)
      fetch("/api/proxy/companies", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Device-ID": getDeviceId(),
        },
      }).catch((err) => console.error("Initial auth check failed:", err))
    }
  }, 5000)

  return () => {
    window.fetch = originalFetch
  }
}
