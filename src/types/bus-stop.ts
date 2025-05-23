export interface BusStop {
    id: number
    name: string
    code: string
    latitude: number
    longitude: number
    is_active: boolean
    created_at?: string
    updated_at?: string
}

export interface BusStopFilters {
    name?: string
    code?: string
    paginate?: boolean
    page?: number
}

export interface CreateBusStopData {
    name: string
    code: string
    latitude: number
    longitude: number
    is_active: boolean
}

export interface UpdateBusStopData extends Partial<CreateBusStopData> {}
