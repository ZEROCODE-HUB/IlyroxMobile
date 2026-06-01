// ============================================
// CreateProperty - Componente principal refactorizado
// Orquesta todos los sub-componentes y hooks
// ============================================

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { ScreenWrapper } from "../../../screens/ScreenWrapper";
import { AppHeader } from "../../AppHeader";
import { SelectionModal } from "../../modals";
import { SaleContractModal } from "../../modals/SaleContractModal";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import CreatePost from "../CreatePost/CreatePost";
import type { Post } from "@/types";

// Sub-componentes
import { ImageGallerySection } from "./ImageGallerySection";
import { BasicInfoSection } from "./BasicInfoSection";
import { LocationSection } from "./LocationSection";
import { PhysicalFeaturesSection } from "./PhysicalFeaturesSection";
import { AmenitiesSection } from "./AmenitiesSection";
import { AgricolaSection } from "./AgricolaSection";
import { ComercialSection } from "./ComercialSection";
import { IndustrialSection } from "./IndustrialSection";
import { OwnerSection } from "./OwnerSection";
import { CommissionSection } from "./CommissionSection";
import { GravamenFinancingSection } from "./GravamenFinancingSection";
import { MapSection } from "./MapSection";
import { ProgressModal } from "./ProgressModal";

// Hooks
import { usePropertyForm } from "./usePropertyForm";
import { usePublishProperty, type OpenHousePrefill, type PublishSuccessInfo } from "./usePublishProperty";
import { PropertyFormProvider } from "./PropertyFormContext";
import { PropertyPublishedSheet } from "./PropertyPublishedSheet";

// Types
import type { CreatePropertyProps } from "./types";

export default function CreateProperty({
  onBack,
  propertyId,
}: CreatePropertyProps) {
  const { user } = useAuth();
  const router = useRouter();
  const form = usePropertyForm(propertyId, onBack);

  // Estado para el flujo de Open House post-publicación
  const [showOpenHouseModal, setShowOpenHouseModal] = useState(false);
  const [openHousePost, setOpenHousePost] = useState<Post | null>(null);

  // Estado del bottom sheet de éxito
  const [showPublishedSheet, setShowPublishedSheet] = useState(false);
  const [publishedInfo, setPublishedInfo] = useState<PublishSuccessInfo | null>(null);

  // Callback que se invoca cuando se publica una propiedad nueva y el usuario
  // elige "Crear Open House" desde el modal de éxito.
  const handleOpenHousePrompt = useCallback(
    async (prefill: OpenHousePrefill) => {
      if (!user) return;
      try {
        // Verificar si ya existe un post de tipo openhouse para esta propiedad
        const { data: existing } = await supabase
          .from("posts")
          .select("*")
          .eq("propiedad_id", prefill.propertyId)
          .eq("tipo", "openhouse")
          .is("deleted_at", null)
          .maybeSingle();

        if (existing) {
          setOpenHousePost(existing as Post);
        } else {
          // Crear el post con status "oculto" para que el usuario lo edite
          const { data: newPost, error } = await supabase
            .from("posts")
            .insert({
              publicado_por: user.id,
              tipo: "openhouse",
              propiedad_id: prefill.propertyId,
              ubicacion: prefill.location,
              foto_propiedad: prefill.firstPhoto ?? null,
              contenido: "Open House",
              fecha_hora: new Date().toISOString(),
              status: "oculto",
            })
            .select()
            .single();

          if (error) throw error;
          setOpenHousePost(newPost as Post);
        }

        setShowOpenHouseModal(true);
      } catch (err: any) {
        console.warn("[CreateProperty] handleOpenHousePrompt error:", err);
        // Si falla, simplemente no abrimos el modal; el usuario ya tiene la propiedad guardada
      }
    },
    [user],
  );

  // Callback de éxito: muestra el bottom sheet con las acciones post-publicación
  const handlePublishSuccess = useCallback((info: PublishSuccessInfo) => {
    setPublishedInfo(info);
    setShowPublishedSheet(true);
  }, []);

  // 4. Hook de publicación (maneja guardado final y UI de load/error)
  const { publishState, handlePublish, cancelPublish, clearPublishError } = usePublishProperty(
    form,
    propertyId as string | undefined,
    onBack,
    // Solo pasar el callback cuando es una propiedad nueva (no edición)
    !propertyId ? handleOpenHousePrompt : undefined,
    handlePublishSuccess,
  );

  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSaleContractModal, setShowSaleContractModal] = useState(false);

  // Manejar publicación con detección de modal de contrato
  const onPublish = async () => {
    const result = await handlePublish();
    if (result === "SHOW_CONTRACT_MODAL") {
      setShowSaleContractModal(true);
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (form.isLoadingProperty) {
    return (
      <ScreenWrapper withHeader={false} style={styles.container}>
        <AppHeader
          title={propertyId ? "Editar Propiedad" : "Crear Propiedad"}
          showBackButton={true}
          onBack={() => onBack(false)}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando propiedad...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (form.loadError && !form.isLoadingProperty) {
    return (
      <ScreenWrapper withHeader={false} style={styles.container}>
        <AppHeader
          title={propertyId ? "Editar Propiedad" : "Crear Propiedad"}
          showBackButton={true}
          onBack={() => onBack(false)}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={COLORS.error} />
          <Text style={styles.errorTitle}>Error al cargar</Text>
          <Text style={styles.errorMessage}>{form.loadError}</Text>
          <View style={styles.errorButtonsRow}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={form.retryLoad}
            >
              <Ionicons name="refresh" size={20} color={COLORS.white} />
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => onBack(false)}
            >
              <Text style={styles.backButtonText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <>
    <PropertyFormProvider value={form}>
    <ScreenWrapper withHeader={false} style={styles.container}>
      <AppHeader
        title={propertyId ? "Editar Propiedad" : "Crear Propiedad"}
        showBackButton={true}
        onBack={() => onBack(false)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        scrollEnabled={scrollEnabled}
      >
        {/* 1. GALERÍA DE IMÁGENES */}
        <ImageGallerySection />

        {/* ESTADO (solo en edición) */}
        {propertyId && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderBand}>
              <Ionicons name="stats-chart-outline" size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitleBand}>Estado de la Propiedad</Text>
            </View>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowStatusModal(true)}
            >
              <Text style={styles.selectorText}>{form.status}</Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={COLORS.textTertiary}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* BANNER: sin comisión (solo en edición de propiedades EasyBroker) */}
        {propertyId && form.sinComision && (
          <View style={styles.commissionBanner}>
            <Ionicons name="warning-outline" size={20} color="#FF6B00" />
            <Text style={styles.commissionBannerText}>
              Esta propiedad está Suspendida porque no tiene comisión configurada en EasyBroker. Completa la sección de Comisión para publicarla.
            </Text>
          </View>
        )}

        {/* 2. INFORMACIÓN BÁSICA */}
        <BasicInfoSection />

        {/* 3. UBICACIÓN */}
        <LocationSection />

        {/* 4. CARACTERÍSTICAS FÍSICAS */}
        <PhysicalFeaturesSection />

        {/* 5. AMENIDADES (solo habitacional) */}
        {form.tipoPrincipal === "habitacional" && <AmenitiesSection />}

        {/* CAMPOS ESPECIALIZADOS — solo si aplica el tipo */}
        {form.tipoPrincipal === 'agricola' && <AgricolaSection />}
        {form.tipoPrincipal === 'comercial' && <ComercialSection />}
        {form.tipoPrincipal === 'industrial' && <IndustrialSection />}

        {/* 6. PROPIETARIO */}
        <OwnerSection />

        {/* 7. COMISIÓN */}
        <CommissionSection onScrollLock={setScrollEnabled} />

        {/* 8. GRAVAMEN Y FINANCIAMIENTO */}
        <GravamenFinancingSection />

        {/* 9. MAPA */}
        <MapSection />
      </ScrollView>

      {/* FOOTER - BOTÓN PUBLICAR */}
      <View style={[styles.footer, { paddingBottom: 50 }]}>
        <TouchableOpacity
          style={[
            styles.publishBtn,
            publishState.uploading && styles.publishBtnDisabled,
          ]}
          onPress={onPublish}
          disabled={publishState.uploading}
        >
          {publishState.uploading ? (
            <>
              <ActivityIndicator color={COLORS.white} />
              <Text style={styles.publishText}>Publicando...</Text>
            </>
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={COLORS.white}
              />
              <Text style={styles.publishText}>
                {propertyId ? "Actualizar Propiedad" : "Publicar Propiedad"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL DE PROGRESO MEJORADO */}
      <ProgressModal 
        publishState={publishState} 
        onCancel={cancelPublish} 
        onCloseError={clearPublishError} 
      />

      {/* STATUS MODAL */}
      <SelectionModal
        visible={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onSelect={(val) => form.setStatus(val)}
        title="Estado de la Propiedad"
        options={form.filteredStatusOptions}
        currentValue={form.status}
      />

      {/* MODAL CONTRATO VENTA/RENTA */}
      <SaleContractModal
        visible={showSaleContractModal}
        statusType={form.status === "Vendida" ? "Vendida" : "Rentada"}
        onConfirm={(data) => {
          form.setContractData(data);
          setShowSaleContractModal(false);
          setTimeout(() => handlePublish(data), 100);
        }}
        onCancel={() => {
          setShowSaleContractModal(false);
        }}
        loading={publishState.uploading}
      />
    </ScreenWrapper>
    </PropertyFormProvider>

    {/* BOTTOM SHEET DE ÉXITO POST-PUBLICACIÓN */}
    <PropertyPublishedSheet
      visible={showPublishedSheet}
      isUpdate={publishedInfo?.isUpdate ?? false}
      newPropertyId={publishedInfo?.newPropertyId ?? null}
      onViewProperty={() => {
        setShowPublishedSheet(false);
        if (publishedInfo?.newPropertyId) {
          router.push({
            pathname: "/(stack)/property/[id]",
            params: { id: publishedInfo.newPropertyId },
          });
        } else {
          if (onBack) onBack(true);
        }
      }}
      onCreateOpenHouse={
        !propertyId && publishedInfo?.newPropertyId
          ? () => {
              setShowPublishedSheet(false);
              void handleOpenHousePrompt({
                propertyId: publishedInfo.newPropertyId!,
                location: publishedInfo.location,
                firstPhoto: publishedInfo.firstPhotoUrl,
              });
            }
          : undefined
      }
      onGoToFeed={() => {
        setShowPublishedSheet(false);
        router.replace({
          pathname: "/(tabs)",
          params: { refresh: String(Date.now()) },
        });
      }}
      onDismiss={() => {
        setShowPublishedSheet(false);
        // Si es edición y cierra el sheet, volver con refresh
        if (publishedInfo?.isUpdate && onBack) onBack(true);
      }}
    />

    {/* MODAL OPEN HOUSE — fuera del ScreenWrapper para que ocupe toda la pantalla */}
    {showOpenHouseModal && openHousePost && (
      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowOpenHouseModal(false);
          setOpenHousePost(null);
        }}
      >
        <CreatePost
          post={openHousePost}
          onBack={() => {
            setShowOpenHouseModal(false);
            setOpenHousePost(null);
          }}
        />
      </Modal>
    )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderBand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary + "12",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  sectionTitleBand: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  selector: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  selectorText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  publishBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  commissionBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FF6B00",
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  commissionBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#B84500",
    lineHeight: 18,
  },
  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  // Error states
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.error,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  errorButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 15,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  backButtonText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontSize: 15,
  },
});
