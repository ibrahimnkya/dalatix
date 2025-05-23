"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useIsMobile } from "@/hooks/use-mobile"

export function RecentCompanies() {
  const isMobile = useIsMobile()

  return (
      <div className="space-y-6">
        {recentCompanies.map((company) => (
            <div key={company.id} className="flex items-center">
              <Avatar className={isMobile ? "h-8 w-8" : "h-9 w-9"}>
                <AvatarFallback className="bg-primary/10 text-secondary">{getInitials(company.name)}</AvatarFallback>
              </Avatar>
              <div className="ml-4 space-y-1">
                <p className={`text-sm font-medium leading-none text-secondary ${isMobile ? "text-xs" : ""}`}>
                  {company.name}
                </p>
                <p className={`text-sm text-muted-foreground ${isMobile ? "text-xs" : ""}`}>{company.email}</p>
              </div>
              <div className={`ml-auto font-medium ${isMobile ? "text-xs" : ""}`}>{company.date}</div>
            </div>
        ))}
      </div>
  )
}

const recentCompanies = [
  {
    id: 1,
    name: "Dalatix Transport Ltd",
    email: "contact@dalatix.com",
    date: "2h ago",
  },
  {
    id: 2,
    name: "Metro Express",
    email: "info@metroexpress.com",
    date: "1d ago",
  },
  {
    id: 3,
    name: "City Movers",
    email: "support@citymovers.com",
    date: "3d ago",
  },
  {
    id: 4,
    name: "FastTrack Logistics",
    email: "hello@fasttrack.com",
    date: "1w ago",
  },
]

function getInitials(name: string): string {
  return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
}
