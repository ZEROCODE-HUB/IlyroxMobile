export type AppointmentStatus = "pending" | "completed" | "cancelled" | "rated";

export interface FeatureRatings {
    conocimiento_mercado: number;
    comunicacion: number;
    profesionalismo: number;
    disponibilidad: number;
}

export interface AppointmentItem {
    id: string;
    fecha: string;
    hora: string;
    tipo: string;
    descripcion: string | null;
    estado: string;
    agente_id: string;
    cliente_id: string;
    propiedad_id: string;
    user: {
        id: string;
        name: string;
        avatar: string | null;
        role: string;
    };
    propertyId?: string;
    propertyTitle?: string;
    propertyImage?: string;
    location: string;
    date: string;
    time: string;
    status: AppointmentStatus;
    rating?: number;
    hasUserRated?: boolean;
    featureRatings?: FeatureRatings;
    agente?: {
        id: string;
        nombre: string;
        apellido_paterno: string;
        foto: string | null;
    };
    cliente?: {
        id: string;
        nombre: string;
        apellido_paterno: string;
        foto: string | null;
    };
}
