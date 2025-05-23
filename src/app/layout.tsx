import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import QueryProvider from "../providers/QueryProvider"
import { ThemeProvider } from "@/components/theme-provider"

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
})

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
})

// Default metadata for the entire app
export const metadata: Metadata = {
    title: {
        template: "%s | Dalatix",
        default: "Dalatix | Login",
    },
    description: "Dalatix Control Panel",
}

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
        </body>
        </html>
    )
}