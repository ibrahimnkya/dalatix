"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode, useState } from "react"
import { AuthProvider } from "./AuthProvider"
import { PermissionsProvider } from "@/hooks/use-permissions"

export default function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                        refetchOnWindowFocus: false,
                        onError: (error: any) => {
                            // Check for 401 errors
                            if (error?.response?.status === 401 || error?.status === 401) {
                                // Trigger logout through event system to avoid circular dependencies
                                window.dispatchEvent(new CustomEvent("auth:unauthorized"))
                            }
                        },
                    },
                    mutations: {
                        onError: (error: any) => {
                            // Check for 401 errors
                            if (error?.response?.status === 401 || error?.status === 401) {
                                // Trigger logout through event system to avoid circular dependencies
                                window.dispatchEvent(new CustomEvent("auth:unauthorized"))
                            }
                        },
                    },
                },
            }),
    )

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <PermissionsProvider>{children}</PermissionsProvider>
            </AuthProvider>
        </QueryClientProvider>
    )
}
