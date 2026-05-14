import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
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
  selectedLocation: {
    type: "estado" | "municipio" | "colonia";
    name: string;
    estado_id: number;
    municipio_nombre?: string;
    estado_nombre?: string;
  } | null;
  setSelectedLocation: (
    location: {
      type: "estado" | "municipio" | "colonia";
      name: string;
      estado_id: number;
      municipio_nombre?: string;
      estado_nombre?: string;
    } | null,
  ) => void;
  isGlobalMuted: boolean;
  setIsGlobalMuted: (muted: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{
    type: "estado" | "municipio" | "colonia";
    name: string;
    estado_id: number;
    municipio_nombre?: string;
    estado_nombre?: string;
  } | null>(null);
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

  const value = {
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
