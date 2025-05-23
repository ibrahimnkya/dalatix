"use client"

import { useState, useEffect } from "react"

export function useMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window !== "undefined") {
      const checkIsMobile = () => {
        setIsMobile(window.innerWidth < breakpoint)
      }

      // Initial check
      checkIsMobile()

      // Add event listener
      window.addEventListener("resize", checkIsMobile)

      // Clean up
      return () => {
        window.removeEventListener("resize", checkIsMobile)
      }
    }
  }, [breakpoint])

  return isMobile
}

// Alias for backward compatibility
export const useIsMobile = useMobile
