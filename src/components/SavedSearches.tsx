import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useModal } from "../context/ModalContext";
import { COLORS } from "../constants/colors";
import { logger } from "@/utils/logger";

const log = logger.scoped("SavedSearches");

const SavedSearches: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { showModal } = useModal();
  const [loading, setLoading] = useState(true);
  const [searches, setSearches] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchSavedSearches();
    }
  }, [user]);

  const fetchSavedSearches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("busquedas_guardadas")
        .select("*")
        .eq("usuario_id", user?.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSearches(data || []);
    } catch (error) {
      log.error("Error fetching saved searches:", error);
      showToast("No se pudieron cargar tus búsquedas", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleSearchActive = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("busquedas_guardadas")
        .update({ activa: !currentValue })
        .eq("id", id);

      if (error) throw error;

      setSearches((prev) =>
        prev.map((s) => (s.id === id ? { ...s, activa: !currentValue } : s))
      );
      showToast(
        !currentValue
          ? "Notificaciones activadas"
          : "Notificaciones desactivadas",
        "info"
      );
    } catch (error) {
      log.error("Error toggling search:", error);
      showToast("Error al actualizar el estado", "error");
    }
  };

  const deleteSearch = (id: string) => {
    showModal({
      title: "Eliminar búsqueda",
      message: "¿Estás seguro de que quieres eliminar esta búsqueda guardada?",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("busquedas_guardadas")
            .update({ deleted_at: new Date().toISOString(), activa: false })
            .eq("id", id);

          if (error) throw error;
          setSearches((prev) => prev.filter((s) => s.id !== id));
          showToast("Búsqueda eliminada", "success");
        } catch (error) {
          log.error("Error deleting search:", error);
          showToast("No se pudo eliminar la búsqueda", "error");
        }
      },
    });
  };

  const renderSearchItem = ({ item }: { item: any }) => {
    const priceRange = item.precio_max
      ? `$${(
          item.precio_min || 0
        ).toLocaleString()} - $${item.precio_max.toLocaleString()}`
      : item.precio_min
      ? `Desde $${item.precio_min.toLocaleString()}`
      : "Precio no indicado";

    const leadInfo = item.leads;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleCol}>
            <Text style={styles.searchTitle}>
              {(item.tipo_propiedad || "Propiedad").charAt(0).toUpperCase() +
                (item.tipo_propiedad || "Propiedad").slice(1)}{" "}
              en {item.ciudad || item.estado || "Ubicación seleccionada"}
            </Text>
            <Text style={styles.priceRange}>{priceRange}</Text>
          </View>
          <Switch
            value={item.activa}
            onValueChange={() => toggleSearchActive(item.id, item.activa)}
            trackColor={{
              false: COLORS.textDisabled,
              true: COLORS.primaryLight,
            }}
            thumbColor={item.activa ? COLORS.primary : COLORS.background}
          />
        </View>

        {leadInfo && (
          <View style={styles.leadInfoContainer}>
            <View style={styles.leadBadge}>
              <Ionicons
                name="person-outline"
                size={12}
                color={COLORS.primary}
              />
              <Text style={styles.leadBadgeText}>
                Prospecto: {leadInfo.nombre}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="repeat" size={14} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>
              {item.tipo_operacion === "venta" ? "Venta" : "Renta"}
            </Text>
          </View>
          {item.habitaciones > 0 && (
            <View style={styles.detailItem}>
              <Ionicons
                name="bed-outline"
                size={14}
                color={COLORS.textSecondary}
              />
              <Text style={styles.detailText}>{item.habitaciones}+ rec.</Text>
            </View>
          )}
          {item.metros_construccion > 0 && (
            <View style={styles.detailItem}>
              <Ionicons
                name="resize-outline"
                size={14}
                color={COLORS.textSecondary}
              />
              <Text style={styles.detailText}>
                {item.metros_construccion}m²+
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          <Text style={styles.dateText}>
            Guardada el {new Date(item.created_at).toLocaleDateString()}
          </Text>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => deleteSearch(item.id)}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Búsquedas Guardadas</Text>
        <Text style={styles.subtitle}>
          Recibe notificaciones de nuevos matches
        </Text>
      </View>

      <FlatList
        data={searches}
        keyExtractor={(item) => item.id}
        renderItem={renderSearchItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="search-outline"
              size={64}
              color={COLORS.textDisabled}
            />
            <Text style={styles.emptyTitle}>No tienes búsquedas guardadas</Text>
            <Text style={styles.emptySubtitle}>
              Guarda una búsqueda desde el mapa para recibir coincidencias.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  leadInfoContainer: {},
  leadBadge: {},
  leadBadgeText: {},
  header: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleCol: {
    flex: 1,
    marginRight: 12,
  },
  searchTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  priceRange: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  deleteBtn: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textTertiary,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 32,
  },
});

export default SavedSearches;
