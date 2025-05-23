"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
    const pathname = usePathname()
    const isMobile = useIsMobile()

    const isActive = (path: string) => pathname === path

    const navItems = [
        { href: "/admin/dashboard", label: "Overview" },
        { href: "/admin/companies", label: "Companies" },
        { href: "/admin/vehicles", label: "Vehicles" },
        { href: "/admin/devices", label: "Devices" },
        { href: "/admin/users", label: "Users" },
        { href: "/admin/settings", label: "Settings" },
    ]

    return (
        <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)} {...props}>
            {navItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        "text-sm transition-colors hover:text-primary",
                        isActive(item.href) ? "font-medium text-primary" : "text-muted-foreground",
                        isMobile && "text-xs",
                    )}
                >
                    {item.label}
                </Link>
            ))}
        </nav>
    )
}
