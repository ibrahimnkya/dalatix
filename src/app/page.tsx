"use client"

import type React from "react"
import Image from "next/image"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login, hasRole } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Check if user is already logged in and redirect accordingly
  useEffect(() => {
    const checkExistingAuth = () => {
      try {
        if (hasRole("Bus Owner")) {
          router.replace("/bus-owner/dashboard")
          return
        }

        if (hasRole("Admin") || hasRole("Super Admin") || hasRole("System Admin")) {
          router.replace("/admin/dashboard")
          return
        }
      } catch (error) {
        // User not logged in, stay on login page
        console.log("No existing auth found")
      }
    }

    checkExistingAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const identifier = formData.get("email") as string // Get email but send as identifier
    const password = formData.get("password") as string

    try {
      // Simulate a slight delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 800))

      const response = await login({ identifier, password }) // Use identifier instead of email
      console.log("Login response:", response)

      if (response.success && response.data?.user) {
        setIsSuccess(true)

        // Wait for success animation, then redirect based on role
        setTimeout(() => {
          // Check user roles from the response
          const user = response.data.user
          const userRoles = user.roles?.map((role) => role.name) || []

          console.log("User roles:", userRoles)

          // Redirect based on role priority
          if (userRoles.includes("Bus Owner")) {
            console.log("Redirecting bus owner to bus-owner dashboard")
            router.replace("/bus-owner/dashboard")
          } else if (
              userRoles.includes("Admin") ||
              userRoles.includes("Super Admin") ||
              userRoles.includes("System Admin")
          ) {
            console.log("Redirecting admin to admin dashboard")
            router.replace("/admin/dashboard")
          } else {
            // Fallback based on user type
            if (user.type === "Bus Owner") {
              router.replace("/bus-owner/dashboard")
            } else {
              router.replace("/admin/dashboard")
            }
          }
        }, 1000)
      } else {
        setError("Login failed. Please check your credentials.")
        setIsLoading(false)
      }
    } catch (err) {
      console.error("Login error:", err)
      setError(err instanceof Error ? err.message : "Invalid email or password")
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.4,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: custom * 0.1,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
  }

  const errorVariants = {
    hidden: { opacity: 0, height: 0, marginBottom: 0 },
    visible: {
      opacity: 1,
      height: "auto",
      marginBottom: "0.75rem",
      transition: {
        duration: 0.3,
        ease: "easeInOut",
      },
    },
  }

  const successVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  }

  return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
        <AnimatePresence mode="wait">
          {isSuccess ? (
              <motion.div
                  key="success"
                  initial="hidden"
                  animate="visible"
                  variants={successVariants}
                  className="flex flex-col items-center justify-center text-center"
              >
                <div className="rounded-full bg-yellow-100 p-3 mb-4">
                  <CheckCircle2 className="h-12 w-12 text-yellow-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Successful!</h2>
                <p className="text-gray-600 mb-4">Redirecting to your dashboard...</p>
                <div className="relative h-1 w-48 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                      className="absolute top-0 left-0 h-full bg-yellow-500"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                  />
                </div>
              </motion.div>
          ) : (
              <motion.div
                  key="login"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={containerVariants}
                  className="w-full max-w-md"
              >
                <Card className="w-full shadow-xl border-0">
                  <CardHeader className="space-y-1 pb-6">
                    <motion.div className="mx-auto mb-6 text-center" variants={itemVariants} custom={0}>
                      <Image
                          src="/dala-black.png"
                          alt="Logo"
                          width={180}
                          height={100}
                          className="rounded-xs mx-auto mb-4"
                      />
                    </motion.div>
                    <motion.div variants={itemVariants} custom={1}>
                      <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
                      <CardDescription className="text-center mt-2">
                        Enter your credentials to access your account
                      </CardDescription>
                    </motion.div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <AnimatePresence>
                        {error && (
                            <motion.div
                                key="error"
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                variants={errorVariants}
                                className="p-3 text-sm text-white bg-red-500 rounded-md text-center"
                            >
                              {error}
                            </motion.div>
                        )}
                      </AnimatePresence>

                      <motion.div className="space-y-2" variants={itemVariants} custom={2}>
                        <Label htmlFor="email" className="text-sm font-medium">
                          Email
                        </Label>
                        <Input
                            id="email"
                            name="email"
                            placeholder="name@company.com"
                            type="email"
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect="off"
                            required
                            disabled={isLoading}
                            className="border border-gray-200 rounded-md p-2 w-full focus:border-[#ffd428] focus:ring-[#ffd428]"
                        />
                      </motion.div>

                      <motion.div className="space-y-2" variants={itemVariants} custom={3}>
                        <Label htmlFor="password" className="text-sm font-medium">
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                              id="password"
                              name="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              autoComplete="current-password"
                              required
                              disabled={isLoading}
                              className="border border-gray-200 rounded-md p-2 w-full pr-10 focus:border-[#ffd428] focus:ring-[#ffd428]"
                          />
                          <button
                              type="button"
                              onClick={togglePasswordVisibility}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                              tabIndex={-1}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </motion.div>

                      <motion.div variants={itemVariants} custom={4} className="pt-2">
                        <Button
                            className="w-full bg-[#ffd428] hover:bg-[#ffd428]/90 text-[#242a37] font-semibold py-6 rounded-md h-11 transition-all duration-200 ease-in-out"
                            type="submit"
                            disabled={isLoading}
                        >
                          {isLoading ? (
                              <motion.div className="flex items-center justify-center">
                                <motion.div
                                    className="mr-2 flex items-center justify-center"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                                >
                                  <Loader2 className="h-4 w-4" />
                                </motion.div>
                                <span>Signing in...</span>
                              </motion.div>
                          ) : (
                              "Sign In"
                          )}
                        </Button>
                      </motion.div>

                      <motion.div variants={itemVariants} custom={5} className="text-center text-sm text-gray-500 mt-4">
                        <div className="flex items-center justify-center mb-2">
                          <ShieldCheck />
                          <p> Secure login provided by MySafari</p>
                        </div>
                      </motion.div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
          )}
        </AnimatePresence>
      </main>
  )
}
