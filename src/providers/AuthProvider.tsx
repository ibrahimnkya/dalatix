"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type User = {
    id: string
    name: string
    email: string
    roles?: string[]
    permissions?: string[]
    [key: string]: any
}

type AuthContextType = {
    user: User | null
    token: string | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (token: string, user: User) => void
    logout: () => void
    updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    // Load auth state from localStorage on mount
    useEffect(() => {
        try {
            const storedToken = localStorage.getItem("token")
            const storedUser = localStorage.getItem("user")

            if (storedToken && storedUser) {
                setToken(storedToken)
                setUser(JSON.parse(storedUser))
                setIsAuthenticated(true)
            }
        } catch (error) {
            console.error("Error loading auth state:", error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Login function
    const login = (newToken: string, newUser: User) => {
        try {
            // Store in state
            setToken(newToken)
            setUser(newUser)
            setIsAuthenticated(true)

            // Store in localStorage
            localStorage.setItem("token", newToken)
            localStorage.setItem("user", JSON.stringify(newUser))

            // Set cookie for API requests
            document.cookie = `token=${newToken}; path=/; max-age=86400; SameSite=Lax`
        } catch (error) {
            console.error("Error during login:", error)
        }
    }

    // Logout function
    const logout = () => {
        try {
            // Clear state
            setToken(null)
            setUser(null)
            setIsAuthenticated(false)

            // Clear localStorage
            localStorage.removeItem("token")
            localStorage.removeItem("user")

            // Clear cookie
            document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

            // Redirect to login
            router.push("/login")
        } catch (error) {
            console.error("Error during logout:", error)
        }
    }

    // Update user function
    const updateUser = (updatedUser: User) => {
        try {
            setUser(updatedUser)
            localStorage.setItem("user", JSON.stringify(updatedUser))
        } catch (error) {
            console.error("Error updating user:", error)
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated,
                isLoading,
                login,
                logout,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
