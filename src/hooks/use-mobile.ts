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

// Add the useMediaQuery function
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window !== "undefined") {
      const media = window.matchMedia(query)

      // Set initial value
      setMatches(media.matches)

      const listener = (e: MediaQueryListEvent) => setMatches(e.matches)

      // Use the newer addEventListener if available, fallback to addListener
      if (media.addEventListener) {
        media.addEventListener("change", listener)
      } else {
        // Fallback for older browsers
        media.addListener(listener)
      }

      return () => {
        if (media.removeEventListener) {
          media.removeEventListener("change", listener)
        } else {
          // Fallback for older browsers
          media.removeListener(listener)
        }
      }
    }
  }, [query])

  return matches
}
