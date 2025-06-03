"use client"

import React from "react"

import { useState } from "react"
import { useTitle } from "@/context/TitleContext"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Settings, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function BusOwnerSettingsPage() {
    const { setTitle } = useTitle()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [formData, setFormData] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    })
    const [errors, setErrors] = useState<Record<string, string>>({})

    React.useEffect(() => {
        setTitle("Settings")
    }, [setTitle])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }))
        }
    }

    const validateForm = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.current_password) {
            newErrors.current_password = "Current password is required"
        }

        if (!formData.new_password) {
            newErrors.new_password = "New password is required"
        } else if (formData.new_password.length < 8) {
            newErrors.new_password = "Password must be at least 8 characters long"
        }

        if (!formData.confirm_password) {
            newErrors.confirm_password = "Please confirm your new password"
        } else if (formData.new_password !== formData.confirm_password) {
            newErrors.confirm_password = "Passwords do not match"
        }

        if (formData.current_password === formData.new_password) {
            newErrors.new_password = "New password must be different from current password"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setLoading(true)

        try {
            const response = await fetch("/api/proxy/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    current_password: formData.current_password,
                    new_password: formData.new_password,
                    new_password_confirmation: formData.confirm_password,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                if (data.errors) {
                    setErrors(data.errors)
                } else {
                    throw new Error(data.message || "Failed to change password")
                }
                return
            }

            toast({
                title: "Success",
                description: "Your password has been changed successfully.",
            })

            // Reset form
            setFormData({
                current_password: "",
                new_password: "",
                confirm_password: "",
            })
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to change password",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Settings" subtitle="Manage your account settings" icon={<Settings className="h-6 w-6" />} />

            <div className="max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Change Password</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert className="mb-6">
                            <AlertDescription>
                                For security reasons, bus owners can only change their password. Other account details must be updated
                                by an administrator.
                            </AlertDescription>
                        </Alert>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="current_password">Current Password</Label>
                                <div className="relative">
                                    <Input
                                        id="current_password"
                                        name="current_password"
                                        type={showCurrentPassword ? "text" : "password"}
                                        value={formData.current_password}
                                        onChange={handleInputChange}
                                        className={errors.current_password ? "border-red-500" : ""}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    >
                                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                                {errors.current_password && <p className="text-sm text-red-500">{errors.current_password}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new_password">New Password</Label>
                                <div className="relative">
                                    <Input
                                        id="new_password"
                                        name="new_password"
                                        type={showNewPassword ? "text" : "password"}
                                        value={formData.new_password}
                                        onChange={handleInputChange}
                                        className={errors.new_password ? "border-red-500" : ""}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                    >
                                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                                {errors.new_password && <p className="text-sm text-red-500">{errors.new_password}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm_password">Confirm New Password</Label>
                                <div className="relative">
                                    <Input
                                        id="confirm_password"
                                        name="confirm_password"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={formData.confirm_password}
                                        onChange={handleInputChange}
                                        className={errors.confirm_password ? "border-red-500" : ""}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                                {errors.confirm_password && <p className="text-sm text-red-500">{errors.confirm_password}</p>}
                            </div>

                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? "Changing Password..." : "Change Password"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
