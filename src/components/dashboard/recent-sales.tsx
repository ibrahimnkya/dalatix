"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useIsMobile } from "@/hooks/use-mobile"

export function RecentSales() {
  const isMobile = useIsMobile()

  return (
      <div className="space-y-8">
        {recentSales.map((sale) => (
            <div key={sale.name} className="flex items-center">
              <Avatar className={cn("h-9 w-9", isMobile && "h-8 w-8")}>
                <AvatarImage src={sale.avatar || "/placeholder.svg"} alt={sale.name} />
                <AvatarFallback>{sale.initials}</AvatarFallback>
              </Avatar>
              <div className="ml-4 space-y-1">
                <p className={cn("text-sm font-medium leading-none", isMobile && "text-xs")}>{sale.name}</p>
                <p className={cn("text-sm text-muted-foreground", isMobile && "text-xs")}>{sale.email}</p>
              </div>
              <div className={cn("ml-auto font-medium", isMobile && "text-sm")}>{sale.amount}</div>
            </div>
        ))}
      </div>
  )
}

const recentSales = [
  {
    name: "Olivia Martin",
    email: "olivia.martin@email.com",
    amount: "+$1,999.00",
    avatar: "/avatars/01.png",
    initials: "OM",
  },
  {
    name: "Jackson Lee",
    email: "jackson.lee@email.com",
    amount: "+$39.00",
    avatar: "/avatars/02.png",
    initials: "JL",
  },
  {
    name: "Isabella Nguyen",
    email: "isabella.nguyen@email.com",
    amount: "+$299.00",
    avatar: "/avatars/03.png",
    initials: "IN",
  },
  {
    name: "William Kim",
    email: "will@email.com",
    amount: "+$99.00",
    avatar: "/avatars/04.png",
    initials: "WK",
  },
  {
    name: "Sofia Davis",
    email: "sofia.davis@email.com",
    amount: "+$39.00",
    avatar: "/avatars/05.png",
    initials: "SD",
  },
]

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
