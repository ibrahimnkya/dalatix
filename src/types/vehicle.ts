export interface Vehicle {
    id: number
    uuid?: string
    name: string
    registration_number: string
    company_id: number
    is_active: boolean
    capacity?: number
    conductor_id?: number | null
    created_at?: string
    updated_at?: string
    deleted_at?: string | null
    company?: {
        id: number
        name: string
        phone_number?: string
        email?: string
    }
    conductor?: {
        id: number
        first_name: string
        last_name: string
    } | null
    device?: {
        id: number
        name: string
        serial_number: string
        type: string
        status: string
        vehicle_id: number
        created_at: string
        updated_at: string
    } | null
    model: string
    status: string
}

export interface VehicleFilters {
    company_id?: number
    status?: string
    name?: string
    paginate?: boolean
    conductor_id?: number
    page?: number
    per_page?: number
}

export interface CreateVehicleData {
    name: string
    registration_number: string
    company_id: number
    is_active: boolean
    capacity?: number
    model: string
    status: string
}

export interface UpdateVehicleData extends Partial<CreateVehicleData> {}

export interface VehicleResponse {
    data: Vehicle[]
    meta?: {
        current_page: number
        from: number
        last_page: number
        path: string
        per_page: number
        to: number
        total: number
    }
}
