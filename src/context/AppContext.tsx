import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useMemo,
} from "react";
import { User, SavedSearch, Lead } from "@/types";
import { useAuth } from "./AuthContext";

import { FALLBACKS } from "@/constants/config";

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  savedSearches: SavedSearch[];
  leads: Lead[];
  saveSearch: (
    name: string,
    filters: string,
    leadName?: string,
    leadPhone?: string,
  ) => void;
  selectedLocation: SelectedLocation | null;
  setSelectedLocation: (location: SelectedLocation | null) => void;
  isGlobalMuted: boolean;
  setIsGlobalMuted: (muted: boolean) => void;
}

/**
 * Ubicación seleccionada en el buscador que el mapa debe centrar.
 *
 * Hay 3 fuentes de verdad para el centrado:
 *   1. `lat`/`lng` (centroide real de la BD de propiedades) — preferido
 *   2. `placeId` real de Google — usado por `getPlaceDetails` en el mapa
 *   3. (ninguno) — el mapa usa Geocoding con nombre + municipio + estado
 */
export type SelectedLocation = {
  type: "estado" | "municipio" | "colonia";
  name: string;
  /** @deprecated Era ID en Supabase Geo. Ahora opcional. */
  estado_id?: number;
  municipio_nombre?: string;
  estado_nombre?: string;
  /** placeId de Google Places para obtener bounds directamente */
  placeId?: string;
  /** Centroide de la zona (promedio de lat/lng de propiedades). */
  lat?: number;
  lng?: number;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [isGlobalMuted, setIsGlobalMuted] = useState(true);

  // Obtener autenticación desde AuthContext
  const { user, profile, loading } = useAuth();

  // Sincronizar con AuthContext
  useEffect(() => {
    if (user && profile) {
      const mappedUser: User = {
        id: profile.id,
        nombre: profile.nombre + " " + profile.apellido_paterno,
        avatar: profile.foto || FALLBACKS.AVATAR_URL,
        role:
          profile.rol === "agente"
            ? "Agent"
            : profile.rol === "admin"
              ? "Admin"
              : "User",
        isFollowing: false,
        rating: 5,
        location: profile.pais
          ? `${profile.pais}, ${profile.estado}`
          : "Ubicación desconocida",
        phone: profile.celular || "",
        aprobaciones_recibidas: profile.aprobaciones_recibidas || 0,
        aprobaciones_requeridas: profile.aprobaciones_requeridas || 3,
      };
      setCurrentUser(mappedUser);
    } else {
      setCurrentUser(null);
    }
  }, [user, profile]);

  const saveSearch = (
    name: string,
    filters: string,
    leadName?: string,
    leadPhone?: string,
  ) => {
    let linkedLead: Lead | undefined;
    if (leadName) {
      const newLead: Lead = {
        id: `lead_${Date.now()}`,
        name: leadName,
        phone: leadPhone,
        status: "New",
      };
      setLeads((prev) => [newLead, ...prev]);
      linkedLead = newLead;
    }
    const newSearch: SavedSearch = {
      id: `search_${Date.now()}`,
      name,
      filters,
      linkedLead,
    };
    setSavedSearches((prev) => [newSearch, ...prev]);
  };

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
      isLoading: loading,
      setIsLoading: () => {}, // Deprecated - controlled by AuthContext
      error,
      setError,
      savedSearches,
      leads,
      saveSearch,
      selectedLocation,
      setSelectedLocation,
      isGlobalMuted,
      setIsGlobalMuted,
    }),
    [
      currentUser,
      loading,
      error,
      savedSearches,
      leads,
      selectedLocation,
      isGlobalMuted,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
