import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { User, Property, SavedSearch, Lead } from "@/types";
import { MOCK_PROPERTIES } from "../../data/mocks";
import { useAuth } from "./AuthContext";

import { supabase } from "@/lib/supabase";

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  properties: Property[];
  addProperty: (p: Property) => void;
  savedSearches: SavedSearch[];
  leads: Lead[];
  saveSearch: (
    name: string,
    filters: string,
    leadName?: string,
    leadPhone?: string,
  ) => void;
  selectedLocation: {
    type: "ciudad" | "municipio" | "colonia";
    name: string;
  } | null;
  setSelectedLocation: (
    location: { type: "ciudad" | "municipio" | "colonia"; name: string } | null,
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
  const [properties, setProperties] = useState<Property[]>(MOCK_PROPERTIES);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{
    type: "ciudad" | "municipio" | "colonia";
    name: string;
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
        avatar: profile.foto || "https://picsum.photos/150",
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

  // Cargar propiedades reales de Supabase
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { data, error } = await supabase
          .from("propiedades")
          .select(
            `
            *,
            operaciones_propiedad (*)
          `,
          )
          .eq("activo", true)
          .is("deleted_at", null);

        if (error) throw error;

        if (data) {
          const mappedProperties: Property[] = data.map((p) => {
            const operacion =
              p.operaciones_propiedad && p.operaciones_propiedad[0];
            return {
              ...p, // Preservar todas las propiedades originales incluyendo operaciones_propiedad
              id: p.id,
              title: `${p.subtipo} en ${p.municipio}`,
              description: p.descripcion,
              price: operacion?.precio || 0,
              currency: operacion?.moneda || "MXN",
              location: {
                address: `${p.calle} ${p.numero_exterior || ""}`,
                country: "México",
                state: p.estado || "",
                city: p.ciudad || "",
                colony: p.colonia || "",
                municipio: p.municipio || "", // Add municipio here
              },
              coordinates:
                p.latitud && p.longitud
                  ? {
                      lat: parseFloat(p.latitud),
                      lng: parseFloat(p.longitud),
                    }
                  : undefined,
              images: p.fotos || [],
              features: {
                beds: p.habitaciones || 0,
                baths: p.banos || 0,
                constructionSqft: p.metros_cuadrados_construccion || 0,
                landSqft: p.metros_cuadrados_terreno || 0,
              },
              amenities: p.amenidades || [],
              type: (p.tipo || "habitacional").toLowerCase() as any,
              subtype: (p.subtipo || "").toLowerCase(),
              operation:
                operacion?.tipo_operacion === "venta" ? "Sale" : "Rent",
              status: "Publicada",
            };
          });
          setProperties(mappedProperties);
        }
      } catch (err) {
        console.error("Error fetching properties:", err);
      }
    };

    fetchProperties();
  }, []);

  const addProperty = (p: Property) => {
    setProperties((prev) => [p, ...prev]);
  };

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
    properties,
    addProperty,
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
