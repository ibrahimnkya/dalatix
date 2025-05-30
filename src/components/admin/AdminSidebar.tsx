"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  Package,
  Settings,
  Smartphone,
  Ticket,
  Truck,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ThemeToggle } from "@/components/theme-toggle"
import { useIsMobile } from "@/hooks/use-mobile"
import { logout } from "@/lib/auth"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTitle, routeTitles } from "@/context/TitleContext"
import { usePermissions } from "@/hooks/use-permissions"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  submenu?: NavItem[]
}

const getNavItemsForUser = (
    hasPermission: (permission: string | string[]) => boolean,
    hasRole: (role: string | string[]) => boolean,
    userType: string | null,
) => {
  const allNavItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Companies",
      href: "/admin/companies",
      icon: Building2,
    },
    {
      title: "Users",
      href: "/admin/users",
      icon: Users,
    },
    {
      title: "Vehicles",
      href: "/admin/vehicles",
      icon: Truck,
    },
    {
      title: "Bus Stops",
      href: "/admin/bus-stops",
      icon: MapPin,
    },
    {
      title: "Routes",
      href: "/admin/routes",
      icon: Map,
    },
    {
      title: "Bookings",
      href: "/admin/bookings",
      icon: Ticket,
    },
    {
      title: "Devices",
      href: "/admin/devices",
      icon: Smartphone,
    },
    {
      title: "Problems",
      href: "/admin/problems",
      icon: AlertCircle,
    },
    {
      title: "Roles & Permissions",
      href: "/admin/roles",
      icon: Users,
    },
    {
      title: "Settings",
      href: "/admin/settings",
      icon: Settings,
    },
  ]

  // Special case: Admin user type with Bus Owner role should see bus owner items
  if (userType === "Admin" && hasRole(["bus_owner", "Bus Owner"])) {
    console.log("User is Admin with Bus Owner role, showing bus owner navigation items")
    return allNavItems.filter((item) =>
        ["Dashboard", "Vehicles", "Bus Stops", "Routes", "Bookings", "Devices", "Settings"].includes(item.title),
    )
  }

  // If user is admin (without bus owner role), show all items
  if (userType === "Admin" || hasRole("Administrator")) {
    console.log("User is admin, showing all navigation items")
    return allNavItems
  }



  // For other roles, filter based on specific permissions
  console.log("User has custom permissions, filtering navigation items")
  return allNavItems.filter((item) => {
    switch (item.title) {
      case "Dashboard":
        return true // Dashboard is always accessible
      case "Companies":
        return hasPermission(["companies.view", "companies.manage", "view-companies", "manage-companies"])
      case "Users":
        return hasPermission(["users.view", "users.manage", "view-users", "manage-users"])
      case "Vehicles":
        return hasPermission(["vehicles.view", "vehicles.manage", "view-vehicles", "manage-vehicles"])
      case "Bus Stops":
        return hasPermission(["bus_stops.view", "bus_stops.manage", "view-bus-stops", "manage-bus-stops"])
      case "Routes":
        return hasPermission(["routes.view", "routes.manage", "view-routes", "manage-routes"])
      case "Bookings":
        return hasPermission(["bookings.view", "bookings.manage", "view-bookings", "manage-bookings"])
      case "Devices":
        return hasPermission(["devices.view", "devices.manage", "view-devices", "manage-devices"])
      case "Problems":
        return hasPermission(["problems.view", "problems.manage", "view-problems", "manage-problems"])
      case "Roles & Permissions":
        return hasPermission([
          "roles.view",
          "roles.manage",
          "permissions.view",
          "permissions.manage",
          "view-roles",
          "manage-roles",
          "view-permissions",
          "manage-permissions",
        ])
      case "Settings":
        return hasPermission(["settings.view", "settings.manage", "view-settings", "manage-settings"])
      default:
        return false
    }
  })
}

interface AdminSidebarProps {
  onClose?: () => void
  isMobile?: boolean
}

export function AdminSidebar({ onClose, isMobile: forceMobile }: AdminSidebarProps) {
  const isMobile = useIsMobile()
  const pathname = usePathname()
  const [expanded, setExpanded] = React.useState(true)
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({})
  const { setTitle } = useTitle()
  const { hasPermission, hasRole } = usePermissions()
  const [userType, setUserType] = React.useState<string | null>(null)

  // Get user type from localStorage or cookie on component mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      // Try to get from localStorage first
      const userTypeFromStorage = localStorage.getItem("user_type")
      if (userTypeFromStorage) {
        setUserType(userTypeFromStorage)
        return
      }

      // Fallback to cookie
      const getCookie = (name: string): string | null => {
        const nameEQ = name + "="
        const ca = document.cookie.split(";")
        for (let i = 0; i < ca.length; i++) {
          let c = ca[i]
          while (c.charAt(0) === " ") c = c.substring(1, c.length)
          if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
        }
        return null
      }

      const userRoleFromCookie = getCookie("user_role")
      if (userRoleFromCookie) {
        setUserType(userRoleFromCookie)
      }
    }
  }, [])

  // Get filtered navigation items based on user permissions and type
  const navItems = React.useMemo(
      () => getNavItemsForUser(hasPermission, hasRole, userType),
      [hasPermission, hasRole, userType],
  )

  // Log permissions and roles for debugging
  React.useEffect(() => {
    console.log("User type:", userType)
    console.log("Has Bus Owner role:", hasRole(["bus_owner", "Bus Owner"]))
    console.log("Has Admin role:", hasRole("admin"))
    console.log(
        "Available navigation items:",
        navItems.map((item) => item.title),
    )
  }, [userType, navItems, hasRole])

  // Check if a path is active (exact match or starts with path for submenu items)
  const isPathActive = (href: string) => {
    if (pathname === href) return true
    if (href !== "/admin/dashboard" && pathname?.startsWith(href)) return true
    return false
  }

  // Update title based on current path
  React.useEffect(() => {
    if (pathname && routeTitles[pathname]) {
      setTitle(routeTitles[pathname])
    } else {
      // Handle subpaths or unknown paths
      const baseRoute = Object.keys(routeTitles).find(
          (route) => pathname?.startsWith(route) && route !== "/admin/dashboard",
      )

      if (baseRoute) {
        setTitle(routeTitles[baseRoute])
      } else if (pathname?.startsWith("/admin")) {
        setTitle("Dashboard") // Default fallback for admin routes
      }
    }
  }, [pathname, setTitle])

  // Close sidebar on mobile by default
  React.useEffect(() => {
    if (isMobile) {
      setExpanded(true) // Always expanded on mobile for better visibility
    } else {
      setExpanded(true) // Default to expanded on desktop
    }
  }, [isMobile])

  // Initialize open menus based on current path
  React.useEffect(() => {
    const newOpenMenus: Record<string, boolean> = {}

    navItems.forEach((item) => {
      if (item.submenu) {
        const isSubmenuActive = item.submenu.some((subItem) => isPathActive(subItem.href))
        if (isSubmenuActive) {
          newOpenMenus[item.title] = true
        }
      }
    })

    setOpenMenus(newOpenMenus)
  }, [pathname, navItems])

  const toggleMenu = (title: string) => {
    if (!expanded && !isMobile) {
      setExpanded(true)
      setOpenMenus((prev) => ({
        ...prev,
        [title]: true,
      }))
      return
    }

    setOpenMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  const handleLogout = () => {
    logout()
  }

  const handleLinkClick = (itemTitle: string) => {
    // Update title when clicking on a link
    setTitle(itemTitle)

    if (isMobile && onClose) {
      onClose()
    }
  }

  return (
      <aside className={cn("h-full bg-background border-r", isMobile ? "w-full" : expanded ? "w-64" : "w-[70px]")}>
        <div className="flex h-16 items-center justify-between border-b px-4">
          {expanded || isMobile ? (
              <>
                <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
                  <Package className="h-5 w-5 text-primary" />
                  <span>Dalatix Admin</span>
                </Link>
                {isMobile && onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
                      <X className="h-5 w-5" />
                    </Button>
                )}
              </>
          ) : (
              <div className="flex w-full justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
          )}
        </div>

        {!isMobile && (
            <Button
                variant="ghost"
                size="icon"
                className="absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border bg-background shadow-md"
                onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
        )}

        <div className="flex flex-col h-[calc(100%-4rem)]">
          <nav className="flex-1 overflow-y-auto py-6 px-3">
            <TooltipProvider delayDuration={0}>
              <div className="space-y-2">
                {navItems.map((item) => {
                  const isMenuOpen = openMenus[item.title] || false
                  const hasSubmenu = item.submenu && item.submenu.length > 0
                  const isMenuActive = hasSubmenu && item.submenu?.some((subItem) => isPathActive(subItem.href))
                  const isItemActive = isPathActive(item.href) || isMenuActive

                  if (hasSubmenu) {
                    return (
                        <Collapsible
                            key={item.title}
                            open={expanded || isMobile ? isMenuOpen || isMenuActive : false}
                            onOpenChange={() => toggleMenu(item.title)}
                        >
                          <div className="relative">
                            {expanded || isMobile ? (
                                <CollapsibleTrigger asChild>
                                  <Button
                                      variant={isItemActive ? "secondary" : "ghost"}
                                      className={cn(
                                          "w-full justify-between gap-1 font-medium h-10",
                                          isItemActive && "text-primary",
                                      )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <item.icon className={cn("h-5 w-5", isItemActive && "text-primary")} />
                                      <span>{item.title}</span>
                                    </div>
                                    <ChevronDown
                                        className={cn(
                                            "h-4 w-4 transition-transform",
                                            (isMenuOpen || isMenuActive) && "rotate-180",
                                        )}
                                    />
                                  </Button>
                                </CollapsibleTrigger>
                            ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                        variant={isItemActive ? "secondary" : "ghost"}
                                        size="icon"
                                        className="w-full h-10"
                                        onClick={() => toggleMenu(item.title)}
                                    >
                                      <item.icon className={cn("h-5 w-5", isItemActive && "text-primary")} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="font-normal">
                                    {item.title}
                                  </TooltipContent>
                                </Tooltip>
                            )}

                            <CollapsibleContent className="space-y-1 px-2 py-1">
                              {expanded || isMobile ? (
                                  item.submenu?.map((subItem) => {
                                    const isSubActive = isPathActive(subItem.href)
                                    return (
                                        <Link
                                            key={subItem.title}
                                            href={subItem.href}
                                            onClick={() => handleLinkClick(subItem.title)}
                                            className={cn(
                                                "flex items-center gap-2 rounded-md px-4 py-3 text-sm font-medium transition-colors",
                                                isSubActive ? "bg-secondary text-primary" : "hover:bg-muted/50",
                                            )}
                                        >
                                          <subItem.icon className={cn("h-5 w-5", isSubActive && "text-primary")} />
                                          <span>{subItem.title}</span>
                                        </Link>
                                    )
                                  })
                              ) : (
                                  <div
                                      className={cn(
                                          "absolute left-full top-0 z-50 ml-2 w-48 rounded-md border bg-background p-2 shadow-md",
                                          !isMenuOpen && "hidden",
                                      )}
                                  >
                                    {item.submenu?.map((subItem) => {
                                      const isSubActive = isPathActive(subItem.href)
                                      return (
                                          <Link
                                              key={subItem.title}
                                              href={subItem.href}
                                              onClick={() => handleLinkClick(subItem.title)}
                                              className={cn(
                                                  "flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                                                  isSubActive ? "bg-secondary text-primary" : "hover:bg-muted/50",
                                              )}
                                          >
                                            <subItem.icon className={cn("h-5 w-5", isSubActive && "text-primary")} />
                                            <span>{subItem.title}</span>
                                          </Link>
                                      )
                                    })}
                                  </div>
                              )}
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                    )
                  }

                  return expanded || isMobile ? (
                      <Link
                          key={item.title}
                          href={item.href}
                          onClick={() => handleLinkClick(item.title)}
                          className={cn(
                              "flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                              isPathActive(item.href) ? "bg-secondary text-primary" : "hover:bg-muted/50",
                          )}
                      >
                        <item.icon className={cn("h-5 w-5", isPathActive(item.href) && "text-primary")} />
                        <span>{item.title}</span>
                      </Link>
                  ) : (
                      <Tooltip key={item.title}>
                        <TooltipTrigger asChild>
                          <Link
                              href={item.href}
                              onClick={() => handleLinkClick(item.title)}
                              className={cn(
                                  "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                                  isPathActive(item.href) ? "bg-secondary text-primary" : "hover:bg-muted/50",
                              )}
                          >
                            <item.icon className={cn("h-5 w-5", isPathActive(item.href) && "text-primary")} />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-normal">
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                  )
                })}
              </div>
            </TooltipProvider>
          </nav>

          <div className={cn("mt-auto border-t p-4", !expanded && !isMobile && "flex flex-col items-center p-2")}>
            {expanded || isMobile ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-muted-foreground">Theme</span>
                    <ThemeToggle />
                  </div>
                  <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive py-3"
                      onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </Button>
                </>
            ) : (
                <>
                  <ThemeToggle className="mb-2" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={handleLogout}
                      >
                        <LogOut className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Logout</TooltipContent>
                  </Tooltip>
                </>
            )}
          </div>
        </div>
      </aside>
  )
}
