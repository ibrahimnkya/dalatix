"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Check, Eye, EyeOff, X, User, Settings, Lock, ChevronLeft, ChevronRight } from "lucide-react"
import { getRoles } from "@/lib/services/role"

// User form schema with validation
const userFormSchema = z.object({
    first_name: z.string().min(2, "First name must be at least 2 characters."),
    last_name: z.string().min(2, "Last name must be at least 2 characters."),
    email: z.string().email("Please enter a valid email address."),
    phone_number: z
        .string()
        .startsWith("255", "Phone number must start with 255")
        .min(12, "Phone number must be at least 12 digits")
        .max(12, "Phone number must be exactly 12 digits")
        .regex(/^[0-9]+$/, "Phone number must contain only digits")
        .optional()
        .or(z.literal("")),
    id_number: z.string().optional(),
    type: z.enum(["Admin", "Agent", "Driver", "Conductor"], {
        required_error: "Please select a user type.",
    }),
    company_id: z.coerce.number().optional(),
    password: z.string().min(8, "Password must be at least 8 characters.").optional(),
    password_confirmation: z.string().optional(),
    is_active: z.boolean().default(true),
    use_float: z.boolean().default(false),
    role: z.coerce.number().optional(),
})

// Add password confirmation validation
const createUserSchema = userFormSchema
    .extend({
        password: z
            .string()
            .min(8, "Password must be at least 8 characters.")
            .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
            .regex(/[a-z]/, "Password must contain at least one lowercase letter")
            .regex(/[0-9]/, "Password must contain at least one number"),
        password_confirmation: z.string(),
    })
    .refine((data) => data.password === data.password_confirmation, {
        message: "Passwords do not match",
        path: ["password_confirmation"],
    })

// For editing, passwords are optional
const editUserSchema = userFormSchema
    .extend({
        password: z
            .string()
            .min(8, "Password must be at least 8 characters.")
            .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
            .regex(/[a-z]/, "Password must contain at least one lowercase letter")
            .regex(/[0-9]/, "Password must contain at least one number")
            .optional()
            .or(z.literal("")),
        password_confirmation: z.string().optional().or(z.literal("")),
    })
    .refine(
        (data) => {
            if (data.password && data.password.length > 0) {
                return data.password === data.password_confirmation
            }
            return true
        },
        {
            message: "Passwords do not match",
            path: ["password_confirmation"],
        },
    )

// Password requirement type
interface PasswordRequirement {
    id: string
    label: string
    regex: RegExp
    isMet: boolean
}

// Tab completion status
interface TabStatus {
    personal: boolean
    account: boolean
    password: boolean
}

// Props for the UserForm component
interface UserFormProps {
    initialData?: any
    onSubmit: (data: any) => Promise<boolean>
    companies: any[]
    userType?: string
    isEditMode?: boolean
    roles?: any[]
}

export function UserForm({
                             initialData,
                             onSubmit,
                             companies,
                             roles = [],
                             userType = "system",
                             isEditMode = false,
                         }: UserFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showPassword, setShowPassword] = useState(!isEditMode)
    const [isLoadingRoles, setIsLoadingRoles] = useState(false)
    const [availableRoles, setAvailableRoles] = useState<any[]>(roles)
    const [showPasswordText, setShowPasswordText] = useState(false)
    const [showConfirmPasswordText, setShowConfirmPasswordText] = useState(false)
    const [activeTab, setActiveTab] = useState("personal")

    // Tab completion tracking
    const [tabStatus, setTabStatus] = useState<TabStatus>({
        personal: false,
        account: false,
        password: false,
    })

    // Password validation state
    const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirement[]>([
        { id: "length", label: "At least 8 characters long", regex: /.{8,}/, isMet: false },
        { id: "uppercase", label: "Contains at least one uppercase letter (A-Z)", regex: /[A-Z]/, isMet: false },
        { id: "lowercase", label: "Contains at least one lowercase letter (a-z)", regex: /[a-z]/, isMet: false },
        { id: "number", label: "Contains at least one number (0-9)", regex: /[0-9]/, isMet: false },
    ])
    const [passwordsMatch, setPasswordsMatch] = useState(true)

    // Determine which schema to use
    const formSchema = isEditMode ? editUserSchema : createUserSchema

    // Initialize the form with react-hook-form
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: {
            first_name: initialData?.first_name || "",
            last_name: initialData?.last_name || "",
            email: initialData?.email || "",
            phone_number: initialData?.phone_number || "255",
            id_number: initialData?.id_number || "",
            type: initialData?.type || "Admin",
            company_id: initialData?.company_id || undefined,
            password: "",
            password_confirmation: "",
            is_active: initialData?.is_active ?? true,
            use_float: initialData?.use_float ?? false,
            role: initialData?.role || undefined,
        },
    })

    // Watch all form fields for validation
    const watchedFields = form.watch()
    const password = form.watch("password")
    const passwordConfirmation = form.watch("password_confirmation")

    // Update tab completion status based on form validation
    useEffect(() => {
        const personalFields = ["first_name", "last_name", "email"]
        const accountFields = ["type"]

        const personalValid =
            personalFields.every((field) => {
                const value = watchedFields[field as keyof typeof watchedFields]
                return value && typeof value === "string" && value.trim().length > 0
            }) &&
            (!watchedFields.email || z.string().email().safeParse(watchedFields.email).success)

        const accountValid = accountFields.every((field) => {
            const value = watchedFields[field as keyof typeof watchedFields]
            return value && typeof value === "string" && value.trim().length > 0
        })

        const passwordValid = isEditMode
            ? true // In edit mode, password is optional
            : password && passwordRequirements.every((req) => req.isMet) && passwordsMatch && passwordConfirmation

        // Only update if the status actually changed
        setTabStatus((prevStatus) => {
            if (
                prevStatus.personal !== personalValid ||
                prevStatus.account !== accountValid ||
                prevStatus.password !== passwordValid
            ) {
                return {
                    personal: personalValid,
                    account: accountValid,
                    password: passwordValid,
                }
            }
            return prevStatus
        })
    }, [
        watchedFields.first_name,
        watchedFields.last_name,
        watchedFields.email,
        watchedFields.type,
        password,
        passwordConfirmation,
        passwordsMatch,
        isEditMode,
        passwordRequirements
            .map((req) => req.isMet)
            .join(","), // Convert to string to avoid array reference issues
    ])

    // Update password requirements validation
    useEffect(() => {
        if (password) {
            setPasswordRequirements((prevRequirements) => {
                const updatedRequirements = prevRequirements.map((req) => ({
                    ...req,
                    isMet: req.regex.test(password),
                }))

                // Only update if something actually changed
                const hasChanges = updatedRequirements.some((req, index) => req.isMet !== prevRequirements[index].isMet)

                return hasChanges ? updatedRequirements : prevRequirements
            })
        } else {
            // Reset requirements if password is empty
            setPasswordRequirements((prevRequirements) => {
                const hasMetRequirements = prevRequirements.some((req) => req.isMet)
                if (hasMetRequirements) {
                    return prevRequirements.map((req) => ({
                        ...req,
                        isMet: false,
                    }))
                }
                return prevRequirements
            })
        }
    }, [password])

    // Check if passwords match
    useEffect(() => {
        const newPasswordsMatch = password === passwordConfirmation || (!password && !passwordConfirmation)

        setPasswordsMatch((prevMatch) => {
            if (prevMatch !== newPasswordsMatch) {
                return newPasswordsMatch
            }
            return prevMatch
        })
    }, [password, passwordConfirmation])

    // Fetch roles when component mounts
    useEffect(() => {
        fetchRoles()
    }, [])

    const fetchRoles = async () => {
        setIsLoadingRoles(true)
        try {
            console.log("Fetching roles for user form...")
            const response = await getRoles({ paginate: false })
            console.log("Roles response:", response)

            let rolesData: any[] = []

            // Handle different response structures
            if (response.data && Array.isArray(response.data.data)) {
                rolesData = response.data.data
            } else if (Array.isArray(response.data)) {
                rolesData = response.data
            } else if (response.data && typeof response.data === "object") {
                rolesData = [response.data]
            }

            console.log("Processed roles data:", rolesData)
            setAvailableRoles(rolesData)
        } catch (error) {
            console.error("Error fetching roles:", error)
            // Fallback to API proxy if the service call fails
            try {
                const response = await fetch("/api/proxy/roles")
                if (!response.ok) {
                    throw new Error("Failed to fetch roles")
                }
                const data = await response.json()
                setAvailableRoles(data.data || [])
            } catch (fallbackError) {
                console.error("Error in fallback roles fetch:", fallbackError)
            }
        } finally {
            setIsLoadingRoles(false)
        }
    }

    // Handle form submission
    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true)
        try {
            // If passwords are empty on edit, remove them from the data
            if (isEditMode && (!values.password || values.password.length === 0)) {
                delete values.password
                delete values.password_confirmation
            }

            // For Agent or Conductor, don't set OTP - it will be generated by the server
            if (values.type === "Agent" || values.type === "Conductor") {
                delete values.otp
            }

            const success = await onSubmit(values)
            if (success && !isEditMode) {
                // Reset form on successful creation
                form.reset({
                    first_name: "",
                    last_name: "",
                    email: "",
                    phone_number: "255",
                    id_number: "",
                    type: "Admin",
                    company_id: undefined,
                    password: "",
                    password_confirmation: "",
                    is_active: true,
                    use_float: false,
                    role: undefined,
                })
                setActiveTab("personal")
            }
            return success
        } catch (error) {
            console.error("Form submission error:", error)
            return false
        } finally {
            setIsSubmitting(false)
        }
    }

    // Form fields depend on user type
    const selectedType = form.watch("type")
    const isDriverOrConductor = selectedType === "Driver" || selectedType === "Conductor"

    // Toggle password fields visibility
    const togglePasswordFields = () => {
        setShowPassword(!showPassword)
        if (!showPassword && isEditMode) {
            form.setValue("password", "")
            form.setValue("password_confirmation", "")

            // Reset password requirements
            const resetRequirements = passwordRequirements.map((req) => ({
                ...req,
                isMet: false,
            }))
            setPasswordRequirements(resetRequirements)
            setPasswordsMatch(true)
        }
    }

    // Ensure phone number always starts with 255
    const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, "") // Remove non-digits

        // Ensure it starts with 255
        if (!value.startsWith("255")) {
            value = "255" + value.replace(/^255/, "")
        }

        // Limit to 12 digits
        if (value.length > 12) {
            value = value.slice(0, 12)
        }

        form.setValue("phone_number", value)
    }

    // Navigation functions
    const goToNextTab = () => {
        if (activeTab === "personal" && tabStatus.personal) {
            setActiveTab("account")
        } else if (activeTab === "account" && tabStatus.account) {
            setActiveTab("password")
        }
    }

    const goToPreviousTab = () => {
        if (activeTab === "password") {
            setActiveTab("account")
        } else if (activeTab === "account") {
            setActiveTab("personal")
        }
    }

    // Get tab status icon
    const getTabStatusIcon = (tabKey: keyof TabStatus) => {
        if (tabStatus[tabKey]) {
            return <Check className="h-4 w-4 text-green-500" />
        }
        return null
    }

    return (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 sm:space-y-8">
                    {/* Progress Header */}
                    <Card className="p-4 sm:p-6">
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                                    {isEditMode ? "Edit User" : "Create New User"}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {isEditMode ? "Update user information" : "Fill in the details to create a new user account"}
                                </p>
                            </div>

                            {/* Progress Indicators */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                                <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto">
                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                        <div
                                            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                                                activeTab === "personal"
                                                    ? "border-primary bg-primary text-primary-foreground"
                                                    : tabStatus.personal
                                                        ? "border-green-500 bg-green-500 text-white"
                                                        : "border-muted-foreground"
                                            }`}
                                        >
                                            {tabStatus.personal && activeTab !== "personal" ? (
                                                <Check className="h-4 w-4" />
                                            ) : (
                                                <User className="h-4 w-4" />
                                            )}
                                        </div>
                                        <span className="text-sm font-medium">Personal</span>
                                    </div>

                                    <div className="w-8 sm:w-12 h-0.5 bg-muted-foreground/30 flex-shrink-0" />

                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                        <div
                                            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                                                activeTab === "account"
                                                    ? "border-primary bg-primary text-primary-foreground"
                                                    : tabStatus.account
                                                        ? "border-green-500 bg-green-500 text-white"
                                                        : "border-muted-foreground"
                                            }`}
                                        >
                                            {tabStatus.account && activeTab !== "account" ? (
                                                <Check className="h-4 w-4" />
                                            ) : (
                                                <Settings className="h-4 w-4" />
                                            )}
                                        </div>
                                        <span className="text-sm font-medium">Account</span>
                                    </div>

                                    <div className="w-8 sm:w-12 h-0.5 bg-muted-foreground/30 flex-shrink-0" />

                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                        <div
                                            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                                                activeTab === "password"
                                                    ? "border-primary bg-primary text-primary-foreground"
                                                    : tabStatus.password
                                                        ? "border-green-500 bg-green-500 text-white"
                                                        : "border-muted-foreground"
                                            }`}
                                        >
                                            {tabStatus.password && activeTab !== "password" ? (
                                                <Check className="h-4 w-4" />
                                            ) : (
                                                <Lock className="h-4 w-4" />
                                            )}
                                        </div>
                                        <span className="text-sm font-medium">Password</span>
                                    </div>
                                </div>

                                {/* Completion Status */}
                                <div className="flex items-center space-x-2">
                                    <Badge variant={Object.values(tabStatus).every(Boolean) ? "default" : "secondary"}>
                                        {Object.values(tabStatus).filter(Boolean).length}/3 Complete
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Tabbed Content */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="hidden">
                            <TabsTrigger value="personal">Personal</TabsTrigger>
                            <TabsTrigger value="account">Account</TabsTrigger>
                            <TabsTrigger value="password">Password</TabsTrigger>
                        </TabsList>

                        {/* Personal Information Tab */}
                        <TabsContent value="personal" className="space-y-6">
                            <Card className="p-4 sm:p-6">
                                <div className="space-y-6">
                                    <div className="border-b pb-4">
                                        <div className="flex items-center space-x-2">
                                            <User className="h-5 w-5 text-primary" />
                                            <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
                                            {getTabStatusIcon("personal")}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">Basic personal details for the user account</p>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                        <FormField
                                            control={form.control}
                                            name="first_name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium">First Name *</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter first name" className="h-10 sm:h-11" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="last_name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium">Last Name *</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter last name" className="h-10 sm:h-11" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium">Email Address *</FormLabel>
                                                    <FormControl>
                                                        <Input type="email" placeholder="Enter email address" className="h-10 sm:h-11" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="phone_number"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium">Phone Number</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="255xxxxxxxxx"
                                                            className="h-10 sm:h-11"
                                                            value={field.value}
                                                            onChange={(e) => handlePhoneNumberChange(e)}
                                                            maxLength={12}
                                                        />
                                                    </FormControl>
                                                    <FormDescription className="text-xs">
                                                        Tanzania format: 255xxxxxxxxx (12 digits)
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                        <FormField
                                            control={form.control}
                                            name="id_number"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium">ID Number</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Enter national ID or passport number"
                                                            className="h-10 sm:h-11"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div></div> {/* Empty div for grid alignment */}
                                    </div>
                                </div>
                            </Card>
                        </TabsContent>

                        {/* Account Information Tab */}
                        <TabsContent value="account" className="space-y-6">
                            <Card className="p-4 sm:p-6">
                                <div className="space-y-6">
                                    <div className="border-b pb-4">
                                        <div className="flex items-center space-x-2">
                                            <Settings className="h-5 w-5 text-primary" />
                                            <h3 className="text-lg font-semibold text-foreground">Account Information</h3>
                                            {getTabStatusIcon("account")}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            User type, company assignment, and role configuration
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                        <FormField
                                            control={form.control}
                                            name="type"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium">User Type *</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-10 sm:h-11">
                                                                <SelectValue placeholder="Select user type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Admin">Administrator</SelectItem>
                                                            <SelectItem value="Agent">Agent</SelectItem>
                                                            <SelectItem value="Driver">Driver</SelectItem>
                                                            <SelectItem value="Conductor">Conductor</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="company_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium">Company</FormLabel>
                                                    <Select
                                                        onValueChange={(value) => field.onChange(Number(value) || undefined)}
                                                        defaultValue={field.value?.toString() || "0"}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger className="h-10 sm:h-11">
                                                                <SelectValue placeholder="Select company" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="0">None</SelectItem>
                                                            {companies?.map((company) => (
                                                                <SelectItem key={company.id} value={company.id.toString()}>
                                                                    {company.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription className="text-xs">Select the company this user belongs to</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                        <FormField
                                            control={form.control}
                                            name="role"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium">Role</FormLabel>
                                                    <Select
                                                        onValueChange={(value) => field.onChange(Number(value) || undefined)}
                                                        defaultValue={field.value?.toString()}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger className="h-10 sm:h-11">
                                                                <SelectValue placeholder="Select role" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="0">None</SelectItem>
                                                            {isLoadingRoles ? (
                                                                <SelectItem value="loading" disabled>
                                                                    Loading roles...
                                                                </SelectItem>
                                                            ) : (
                                                                availableRoles.map((role) => (
                                                                    <SelectItem key={role.id} value={role.id.toString()}>
                                                                        {role.name}
                                                                    </SelectItem>
                                                                ))
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription className="text-xs">Assign a role to this user</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="is_active"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium">Account Status</FormLabel>
                                                    <div className="pt-2">
                                                        <RadioGroup
                                                            onValueChange={(value) => field.onChange(value === "active")}
                                                            defaultValue={field.value ? "active" : "inactive"}
                                                            className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6"
                                                        >
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="active" id="active" />
                                                                <FormLabel
                                                                    htmlFor="active"
                                                                    className="flex items-center text-sm font-normal cursor-pointer"
                                                                >
                                                                    <Check className="h-4 w-4 mr-2 text-green-500" />
                                                                    Active
                                                                </FormLabel>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="inactive" id="inactive" />
                                                                <FormLabel
                                                                    htmlFor="inactive"
                                                                    className="flex items-center text-sm font-normal cursor-pointer"
                                                                >
                                                                    <X className="h-4 w-4 mr-2 text-red-500" />
                                                                    Inactive
                                                                </FormLabel>
                                                            </div>
                                                        </RadioGroup>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Use Float option for Drivers and Conductors */}
                                    {isDriverOrConductor && (
                                        <div className="pt-4 border-t">
                                            <FormField
                                                control={form.control}
                                                name="use_float"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-lg bg-muted/20">
                                                        <FormControl>
                                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                        </FormControl>
                                                        <div className="space-y-1 leading-none">
                                                            <FormLabel className="text-sm font-medium">Enable Float Account</FormLabel>
                                                            <FormDescription className="text-xs">
                                                                Allow this user to maintain a float balance for transactions and ticket sales.
                                                            </FormDescription>
                                                        </div>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </TabsContent>

                        {/* Password Tab */}
                        <TabsContent value="password" className="space-y-6">
                            <Card className="p-4 sm:p-6">
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b pb-4 space-y-2 sm:space-y-0">
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <Lock className="h-5 w-5 text-primary" />
                                                <h3 className="text-lg font-semibold text-foreground">
                                                    {isEditMode ? "Change Password" : "Set Password"}
                                                </h3>
                                                {getTabStatusIcon("password")}
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isEditMode
                                                    ? "Update the user's password (leave blank to keep current password)"
                                                    : "Set a secure password for the user account"}
                                            </p>
                                        </div>
                                        {isEditMode && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={togglePasswordFields}
                                                className="w-full sm:w-auto"
                                            >
                                                {showPassword ? "Cancel" : "Change Password"}
                                            </Button>
                                        )}
                                    </div>

                                    {showPassword && (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                            <FormField
                                                control={form.control}
                                                name="password"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-sm font-medium">
                                                            {isEditMode ? "New Password" : "Password"} *
                                                        </FormLabel>
                                                        <div className="relative">
                                                            <FormControl>
                                                                <Input
                                                                    type={showPasswordText ? "text" : "password"}
                                                                    placeholder="Enter password"
                                                                    className="h-10 sm:h-11 pr-10"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="absolute right-0 top-0 h-10 sm:h-11 w-10 hover:bg-transparent"
                                                                onClick={() => setShowPasswordText(!showPasswordText)}
                                                            >
                                                                {showPasswordText ? (
                                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                                ) : (
                                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="password_confirmation"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-sm font-medium">Confirm Password *</FormLabel>
                                                        <div className="relative">
                                                            <FormControl>
                                                                <Input
                                                                    type={showConfirmPasswordText ? "text" : "password"}
                                                                    placeholder="Confirm password"
                                                                    className="h-10 sm:h-11 pr-10"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="absolute right-0 top-0 h-10 sm:h-11 w-10 hover:bg-transparent"
                                                                onClick={() => setShowConfirmPasswordText(!showConfirmPasswordText)}
                                                            >
                                                                {showConfirmPasswordText ? (
                                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                                ) : (
                                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                        {!passwordsMatch && passwordConfirmation && (
                                                            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                                                        )}
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}

                                    {/* Password Requirements with Live Validation */}
                                    {showPassword && (
                                        <div className="bg-muted/30 border rounded-lg p-4">
                                            <h4 className="text-sm font-medium mb-3">Password Requirements</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {passwordRequirements.map((req) => (
                                                    <div key={req.id} className="flex items-center text-xs">
                            <span
                                className={`mr-2 flex-shrink-0 ${req.isMet ? "text-green-500" : "text-muted-foreground"}`}
                            >
                              {req.isMet ? (
                                  <Check className="h-4 w-4" />
                              ) : (
                                  <div className="h-4 w-4 border rounded-full border-muted-foreground" />
                              )}
                            </span>
                                                        <span className={req.isMet ? "text-foreground" : "text-muted-foreground"}>{req.label}</span>
                                                    </div>
                                                ))}
                                                {/* Password match requirement */}
                                                <div className="flex items-center text-xs sm:col-span-2">
                          <span
                              className={`mr-2 flex-shrink-0 ${
                                  passwordsMatch || !passwordConfirmation
                                      ? passwordConfirmation
                                          ? "text-green-500"
                                          : "text-muted-foreground"
                                      : "text-red-500"
                              }`}
                          >
                            {passwordConfirmation ? (
                                passwordsMatch ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <X className="h-4 w-4" />
                                )
                            ) : (
                                <div className="h-4 w-4 border rounded-full border-muted-foreground" />
                            )}
                          </span>
                                                    <span
                                                        className={
                                                            !passwordConfirmation
                                                                ? "text-muted-foreground"
                                                                : passwordsMatch
                                                                    ? "text-foreground"
                                                                    : "text-red-500"
                                                        }
                                                    >
                            Passwords match
                          </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    {/* Navigation and Submit */}
                    <Card className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                            <div className="flex space-x-2 w-full sm:w-auto">
                                {activeTab !== "personal" && (
                                    <Button type="button" variant="outline" onClick={goToPreviousTab} className="flex-1 sm:flex-none">
                                        <ChevronLeft className="h-4 w-4 mr-2" />
                                        Previous
                                    </Button>
                                )}
                            </div>

                            <div className="flex space-x-2 w-full sm:w-auto">
                                {activeTab !== "password" ? (
                                    <Button
                                        type="button"
                                        onClick={goToNextTab}
                                        disabled={
                                            (activeTab === "personal" && !tabStatus.personal) ||
                                            (activeTab === "account" && !tabStatus.account)
                                        }
                                        className="flex-1 sm:flex-none"
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4 ml-2" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting || (!isEditMode && !Object.values(tabStatus).every(Boolean))}
                                        className="flex-1 sm:flex-none min-w-[120px] h-10 sm:h-11"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <LoadingSpinner className="mr-2 h-4 w-4" />
                                                {isEditMode ? "Updating..." : "Creating..."}
                                            </>
                                        ) : isEditMode ? (
                                            "Update User"
                                        ) : (
                                            "Create User"
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                </form>
            </Form>
        </div>
    )
}
