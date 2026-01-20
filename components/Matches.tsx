import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { FeedItem, User } from "../types";
import PropertyDetail from "./Details/PropertyDetail";
import { LeadMatchCard } from "./LeadMatchCard";
import { LeadPropertiesModal } from "./LeadPropertiesModal";
import { AppHeader } from "./AppHeader";
import { COLORS } from "../constants";
import { ScreenWrapper } from "../screens/ScreenWrapper";

export type MatchType = "coincidencia" | "similar";

interface MatchData {
  id: string;
  propiedad_id: string;
  busqueda_id: string;
  usuario_id: string;
  tipo_match: MatchType;
  estado: string;
  created_at: string;
  propiedad: any;
  busqueda: any;
}

interface LeadGroup {
  leadId: string;
  leadName: string;
  leadPhone: string;
  busquedaId: string;
  matches: MatchData[];
  properties: FeedItem[];
  latestMatchDate: string;
  minPrice: number;
  maxPrice: number;
  currency: string;
  matchCount: number;
  similarCount: number;
  leadEmail?: string;
  coincidences: FeedItem[];
  similars: FeedItem[];
  searchCriteria: {
    tipo_propiedad?: string;
    subtipo?: string;
    ciudad?: string;
    municipio?: string;
    colonia?: string;
    tipo_operacion?: string;
    precio_min?: number;
    precio_max?: number;
    moneda?: string;
    habitaciones?: string;
    banos?: string;
    estacionamientos?: string;
    metros_terreno?: number;
    metros_construccion?: number;
  };
}

const Matches: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  // const [activeTab, setActiveTab] = useState<MatchType>("coincidencia"); // Removed tabs
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null,
  );
  const [selectedLead, setSelectedLead] = useState<LeadGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchMatches = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // PASO 1: Obtener TODAS las búsquedas guardadas activas del usuario
      const { data: searchesData, error: searchesError } = await supabase
        .from("busquedas_guardadas")
        .select(
          `
        *,
        lead:leads(*)
      `,
        )
        .eq("usuario_id", user.id)
        .eq("activa", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (searchesError) throw searchesError;

      setSavedSearches(searchesData || []);

      // PASO 2: Obtener matches
      let { data, error } = await supabase
        .from("matches")
        .select(
          `
        *,
        propiedad:propiedades (
          *,
          operaciones:operaciones_propiedad(*)
        ),
        busqueda:busquedas_guardadas(
          *,
          lead:leads(*)
        )
      `,
        )
        .eq("usuario_id", user.id)
        .eq("activo", true)
        .neq("estado", "descartado")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Si tenemos datos, obtener perfiles por separado
      if (data && data.length > 0) {
        const createdByIds = data
          .map((m) => m.propiedad?.created_by)
          .filter((id) => id);

        if (createdByIds.length > 0) {
          const { data: perfiles, error: perfilesError } = await supabase
            .from("perfiles")
            .select("*")
            .in("id", createdByIds);

          if (!perfilesError && perfiles) {
            data = data.map((match) => {
              if (match.propiedad && match.propiedad.created_by) {
                const perfil = perfiles.find(
                  (p) => p.id === match.propiedad.created_by,
                );
                return {
                  ...match,
                  propiedad: {
                    ...match.propiedad,
                    perfil: perfil || null,
                  },
                };
              }
              return match;
            });
          }
        }
      }

      setMatches(data || []);
    } catch (error) {
      console.error("Error fetching matches:", error);
      Alert.alert("Error", "No se pudieron cargar los matches");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [user]);

  const handleDeleteSearch = async (busquedaId: string) => {
    try {
      // Soft delete de la búsqueda guardada
      const { error } = await supabase
        .from("busquedas_guardadas")
        .update({ deleted_at: new Date().toISOString(), activa: false })
        .eq("id", busquedaId);

      if (error) throw error;

      // Desactivar matches asociados
      await supabase
        .from("matches")
        .update({ activo: false })
        .eq("busqueda_id", busquedaId);

      Alert.alert("Éxito", "Búsqueda eliminada correctamente");
      fetchMatches(); // Recargar datos
    } catch (error) {
      console.error("Error deleting search:", error);
      Alert.alert("Error", "No se pudo eliminar la búsqueda");
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  // Agrupar matches por lead e incluir búsquedas sin matches
  const groupMatchesByLead = (
    matchesList: MatchData[],
    allSearches: any[],
  ): LeadGroup[] => {
    console.log("=== AGRUPANDO MATCHES ===");
    const grouped = new Map<string, LeadGroup>();

    // 1. Inicializar grupos con todas las búsquedas que tienen un lead
    allSearches.forEach((search) => {
      const lead = search.lead;
      if (lead && lead.id) {
        grouped.set(lead.id, {
          leadId: lead.id,
          leadName: lead.nombre || "Lead sin nombre",
          leadPhone: lead.telefono || "Sin teléfono",
          leadEmail: lead.correo || lead.email,
          busquedaId: search.id,
          matches: [],
          properties: [],
          latestMatchDate: search.created_at, // Usar fecha de creación de búsqueda por defecto
          minPrice: search.precio_min || 0,
          maxPrice: search.precio_max || 0,
          currency: search.moneda || search.monera || "MXN",
          matchCount: 0,
          similarCount: 0,
          coincidences: [],
          similars: [],
          searchCriteria: {
            tipo_propiedad: search.tipo_propiedad,
            subtipo: search.subtipo,
            ciudad: search.ciudad,
            municipio: search.municipio,
            colonia: search.colonia,
            tipo_operacion: search.tipo_operacion,
            precio_min: search.precio_min,
            precio_max: search.precio_max,
            moneda: search.moneda || search.monera,
            habitaciones: search.habitaciones,
            banos: search.banos,
            estacionamientos: search.estacionamientos,
            metros_terreno: search.metros_terreno,
            metros_construccion: search.metros_construccion,
          },
        });
      }
    });

    // 2. Llenar con matches existentes
    matchesList.forEach((match) => {
      const lead = match.busqueda?.lead;
      const leadId = lead?.id;

      if (!leadId) return;

      // Si el lead no estaba en las búsquedas (raro pero posible), lo agregamos
      if (!grouped.has(leadId)) {
        grouped.set(leadId, {
          leadId,
          leadName: lead.nombre || "Lead sin nombre",
          leadPhone: lead.telefono || "Sin teléfono",
          leadEmail: lead.correo || lead.email,
          busquedaId: match.busqueda_id,
          matches: [],
          properties: [],
          latestMatchDate: match.created_at,
          minPrice: match.busqueda?.precio_min || 0,
          maxPrice: match.busqueda?.precio_max || 0,
          currency: match.busqueda?.moneda || match.busqueda?.monera || "MXN",
          matchCount: 0,
          similarCount: 0,
          coincidences: [],
          similars: [],
          searchCriteria: {
            tipo_propiedad: match.busqueda?.tipo_propiedad,
            subtipo: match.busqueda?.subtipo,
            ciudad: match.busqueda?.ciudad,
            municipio: match.busqueda?.municipio,
            colonia: match.busqueda?.colonia,
            tipo_operacion: match.busqueda?.tipo_operacion,
            precio_min: match.busqueda?.precio_min,
            precio_max: match.busqueda?.precio_max,
            moneda: match.busqueda?.moneda || match.busqueda?.monera,
            habitaciones: match.busqueda?.habitaciones,
            banos: match.busqueda?.banos,
            estacionamientos: match.busqueda?.estacionamientos,
            metros_terreno: match.busqueda?.metros_terreno,
            metros_construccion: match.busqueda?.metros_construccion,
          },
        });
      }

      const group = grouped.get(leadId)!;
      group.matches.push(match);

      if (match.tipo_match === "coincidencia") {
        group.matchCount++;
      } else {
        group.similarCount++;
      }

      // Actualizar fecha más reciente si el match es más nuevo
      if (new Date(match.created_at) > new Date(group.latestMatchDate)) {
        group.latestMatchDate = match.created_at;
      }

      // Convertir propiedad a FeedItem
      const prop = match.propiedad;
      if (!prop) return; // Seguridad extra

      const operacion = prop.operaciones?.[0];

      let perfil = prop.perfil;
      if (Array.isArray(perfil)) {
        perfil = perfil[0];
      }

      // Parse images
      let propertyImages: string[] = [];
      const rawFotos = prop.fotos;

      if (Array.isArray(rawFotos)) {
        propertyImages = rawFotos;
      } else if (
        typeof rawFotos === "string" &&
        rawFotos.trim().startsWith("[")
      ) {
        try {
          propertyImages = JSON.parse(rawFotos);
        } catch (e) {
          propertyImages = rawFotos.split(",").map((s) => s.trim());
        }
      } else if (typeof rawFotos === "string") {
        if (rawFotos.includes(",")) {
          propertyImages = rawFotos.split(",").map((s) => s.trim());
        } else {
          propertyImages = [rawFotos];
        }
      }

      if (propertyImages.length === 0) {
        propertyImages = [
          "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1080&q=80",
        ];
      }

      const feedItem: FeedItem = {
        id: prop.id,
        type: "property",
        user: {
          id: perfil?.id || prop.created_by,
          nombre: perfil?.nombre || "Vendedor",
          name: perfil?.nombre || "Vendedor",
          avatar:
            perfil?.foto ||
            `https://ui-avatars.com/api/?name=V&background=${COLORS.primary.substring(
              1,
            )}&color=fff`,
          isFollowing: false,
          role: (perfil?.rol === "agente" ? "Agent" : "User") as any,
        } as User,
        content: prop.descripcion || "",
        images: propertyImages,
        likes: 0,
        comments: 0,
        timestamp: new Date(match.created_at).toLocaleDateString(),
        propertyDetails: {
          id: prop.id,
          title: `${prop.subtipo} en ${prop.municipio}`,
          description: prop.descripcion,
          price: operacion?.precio || 0,
          currency: operacion?.moneda || "MXN",
          location: {
            address: `${prop.calle || ""} ${prop.numero_exterior || ""}`.trim(),
            city: prop.ciudad,
            state: "",
            country: "México",
            colony: prop.colonia,
            municipio: prop.municipio,
          },
          images: propertyImages,
          features: {
            beds: prop.habitaciones,
            baths: prop.banos,
            parking: prop.estacionamientos,
            constructionSqft: prop.metros_cuadrados_construccion,
            landSqft: prop.metros_cuadrados_terreno,
          },
          type: prop.tipo,
          subtype: prop.subtipo,
          operation: operacion?.tipo_operacion === "venta" ? "Sale" : "Rent",
          status: "Publicada",
          amenities: [],
        },
      };

      group.properties.push(feedItem);

      if (match.tipo_match === "coincidencia") {
        group.coincidences.push(feedItem);
      } else {
        group.similars.push(feedItem);
      }
    });

    // Convertir a array y ordenar por fecha más reciente
    // Convertir a array y ordenar
    const result = Array.from(grouped.values()).sort((a, b) => {
      const aHasMatches = a.matches.length > 0;
      const bHasMatches = b.matches.length > 0;

      // 1. Primero: Los que tienen matches
      if (aHasMatches && !bHasMatches) return -1;
      if (!aHasMatches && bHasMatches) return 1;

      // 2. Dentro de cada grupo, ordenar por fecha más reciente
      const aDate = new Date(a.latestMatchDate).getTime();
      const bDate = new Date(b.latestMatchDate).getTime();

      return bDate - aDate; // Más reciente primero
    });

    return result;
  };

  // const filteredMatches = matches.filter((m) => m.tipo_match === activeTab); // No filtering
  // const filteredMatches = matches.filter((m) => m.tipo_match === activeTab); // No filtering
  const leadGroups = groupMatchesByLead(matches, savedSearches).filter((lead) =>
    lead.leadName.toLowerCase().includes(searchQuery.toLowerCase()),
  ); // Pass all matches

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      {/* Header */}
      <AppHeader
        title="Matches"
        showBackButton
        onBack={() => navigation.goBack()}
      />

      {/* Tabs Removed */}

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar prospecto..."
            placeholderTextColor={COLORS.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={COLORS.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {loading ? ( // Show loading inside if initial load
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={{ marginTop: 50 }}
          />
        ) : leadGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="search-outline"
              size={64}
              color={COLORS.cardBorder}
            />
            <Text style={styles.emptyText}>
              No hay matches en esta categoría
            </Text>
          </View>
        ) : (
          leadGroups.map((lead) => (
            <LeadMatchCard
              key={lead.leadId}
              leadName={lead.leadName}
              leadPhone={lead.leadPhone}
              minPrice={lead.minPrice}
              maxPrice={lead.maxPrice}
              currency={lead.currency}
              matchCount={lead.matchCount}
              similarCount={lead.similarCount}
              onPress={() => setSelectedLead(lead)}
            />
          ))
        )}
      </ScrollView>

      {/* Modal de todas las propiedades del lead */}
      {selectedLead && (
        <LeadPropertiesModal
          visible={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          leadName={selectedLead.leadName}
          leadPhone={selectedLead.leadPhone}
          leadEmail={selectedLead.leadEmail}
          busquedaId={selectedLead.busquedaId}
          coincidences={selectedLead.coincidences}
          similars={selectedLead.similars}
          searchCriteria={selectedLead.searchCriteria}
          onPropertyClick={(propertyId) => {
            setSelectedLead(null);
            setSelectedPropertyId(propertyId);
          }}
          onUserClick={(user) => {
            setSelectedLead(null);
            navigation.navigate("UserProfile", { userId: user.id });
          }}
          onDeleteSearch={handleDeleteSearch}
          currentUserId={user?.id}
        />
      )}

      {/* Modal de detalle de propiedad */}
      {selectedPropertyId && (
        <Modal visible={!!selectedPropertyId} animationType="slide">
          <PropertyDetail
            propertyId={selectedPropertyId}
            navigation={{
              goBack: () => setSelectedPropertyId(null),
            }}
          />
        </Modal>
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBorder,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.white,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textTertiary,
    textAlign: "center",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: COLORS.white,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background, // o un color gris claro
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
});

export default Matches;
