export interface BookingFilters {
    startDate?: string
    endDate?: string
    status?: string
    company_id?: number
    used?: boolean
    paginate?: boolean
    page?: number
}

export interface BookingStatusUpdateRequest {
    status: string
}

export interface Booking {
    id: number
    booking_number: string
    user_id: number
    vehicle_id: number | null
    start_point_id: number
    end_point_id: number
    fare: string | number
    percel_fare?: string | number
    has_percel: boolean
    type: string
    status: string
    used: boolean
    scanned_in_at: string | null
    scanned_out_at: string | null
    cancelled_at: string | null
    expired_at: string | null
    created_at: string
    updated_at: string
    user?: {
        id: number
        first_name: string
        last_name: string
        email: string
        phone_number: string
    }
    vehicle?: {
        id: number
        name: string
        registration_number: string
        company_id: number
        company?: {
            id: number
            name: string
        }
    }
    start_point?: {
        id: number
        name: string
        code: string
    }
    end_point?: {
        id: number
        name: string
        code: string
    }
}
