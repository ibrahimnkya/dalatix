// Let's add a proper User interface with permission related fields

export interface User {
    id?: number
    first_name?: string
    last_name?: string
    email?: string
    phone_number?: string
    id_number?: string
    is_active?: boolean
    use_float?: boolean
    company_id?: number
    type?: string
    password?: string
    otp?: number
    created_at?: string
    updated_at?: string
    roles?: {
        id: number
        name: string
        permissions?: {
            id: number
            name: string
        }[]
    }[]
    vehicles?: {
        id: number
        name: string
        registration_number: string
    }[]
    permissions?: string[] // List of permission names the user has
}
