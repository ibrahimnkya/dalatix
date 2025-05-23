export interface BookingPoint {
    id: number
    name: string
    code: string
}

export interface BookingVehicle {
    id: number
    name: string
    registration_number: string
}

export interface BookingUser {
    id: number
    first_name: string
    last_name: string
}

export interface Booking {
    id: number
    start_point_id: number
    end_point_id: number
    fare: string
    booking_number: string
    expired_at: string
    type: string
    has_percel: boolean
    percel_fare: string
    user_id: number
    vehicle_id: number
    used: boolean
    scanned_in_at: string | null
    scanned_out_at: string | null
    created_at: string
    updated_at: string
    status: string
    cancelled_by: number | null
    cancelled_at: string | null
    deactivated_by: number | null
    deactivated_at: string | null

    // Nested objects
    vehicle: BookingVehicle
    user: BookingUser
    cancellor: any | null
    deactivator: any | null
    start_point: BookingPoint
    end_point: BookingPoint
}

export interface BookingResponse {
    data: Booking[]
    meta: {
        current_page: number
        from: number
        last_page: number
        per_page: number
        to: number
        total: number
    }
}

export interface BookingStatusUpdateRequest {
    status: string
}

export interface BookingFilters {
    startDate?: string
    endDate?: string
    status?: string
    paginate?: boolean
    page?: number
}
