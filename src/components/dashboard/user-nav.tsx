"use client"

import { LogOut, Settings, User, Clock } from "lucide-react"
import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logout } from "@/lib/auth"

export function UserNav() {
    const [currentTime, setCurrentTime] = useState(new Date())
    const [userName, setUserName] = useState("Admin")

    useEffect(() => {
        // Update time every second
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)

        // Get user name from localStorage or cookies
        const storedUser = localStorage.getItem("user")
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser)

                // Priority order for displaying name:
                // 1. fullName (if available)
                // 2. firstName (if available)
                // 3. first_name (snake_case variant)
                // 4. name (generic name field)
                // 5. username (fallback)
                // 6. "Admin" (default fallback)
                const displayName = user.fullName ||
                    user.firstName ||
                    user.first_name ||
                    user.name ||
                    user.username
                    // "Admin"

                setUserName(displayName)
            } catch (error) {
                console.error("Error parsing user data:", error)
            }
        }

        return () => clearInterval(timer)
    }, [])

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        })
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        })
    }

    const getGreeting = () => {
        const hour = currentTime.getHours()
        if (hour < 12) return "Good Morning"
        if (hour < 17) return "Good Afternoon"
        return "Good Evening"
    }

    return (
        <div className="flex items-center space-x-4">
            {/* User Greeting Section */}
            <div className="hidden md:flex flex-row gap-4 items-end text-right">
                <div className="text-sm font-medium text-foreground">
                    {getGreeting()}, {userName}!
                </div>
                <div className="text-xs text-muted-foreground">{formatDate(currentTime)}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="mr-1 h-3 w-3" />
                    {formatTime(currentTime)}
                </div>
            </div>

            {/* User Menu Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full border-2 border-muted">
                        <User className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{userName}</p>
                            <p className="text-xs leading-none text-muted-foreground">{getGreeting()}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout()}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}