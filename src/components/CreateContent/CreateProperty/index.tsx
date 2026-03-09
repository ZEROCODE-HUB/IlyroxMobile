// ============================================
// CreateProperty - Componente principal refactorizado
// Orquesta todos los sub-componentes y hooks
// ============================================

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { ScreenWrapper } from "../../../screens/ScreenWrapper";
import { AppHeader } from "../../AppHeader";
import { SelectionModal } from "../../modals";
import { SaleContractModal } from "../../modals/SaleContractModal";

// Sub-componentes
import { ImageGallerySection } from "./ImageGallerySection";
import { BasicInfoSection } from "./BasicInfoSection";
import { LocationSection } from "./LocationSection";
import { PhysicalFeaturesSection } from "./PhysicalFeaturesSection";
import { AmenitiesSection } from "./AmenitiesSection";
import { OwnerSection } from "./OwnerSection";
import { CommissionSection } from "./CommissionSection";
import { GravamenFinancingSection } from "./GravamenFinancingSection";
import { MapSection } from "./MapSection";
import { ProgressModal } from "./ProgressModal";

// Hooks
import { usePropertyForm } from "./usePropertyForm";
import { usePublishProperty } from "./usePublishProperty";

// Types
import type { CreatePropertyProps } from "./types";

export default function CreateProperty({
  onBack,
  propertyId,
}: CreatePropertyProps) {
  const form = usePropertyForm(propertyId, onBack);
  const { publishState, handlePublish, cancelPublish } = usePublishProperty(
    form,
    propertyId,
    onBack,
  );

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
      >
        {/* 1. GALERÍA DE IMÁGENES */}
        <ImageGallerySection
          images={form.images}
          setImages={form.setImages}
          error={form.errors.images}
        />

        {/* ESTADO (solo en edición) */}
        {propertyId && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="stats-chart" size={24} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Estado de la Propiedad</Text>
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

        {/* 2. INFORMACIÓN BÁSICA */}
        <BasicInfoSection
          descripcion={form.descripcion}
          setDescripcion={form.setDescripcion}
          tipoOperacion={form.tipoOperacion}
          setTipoOperacion={form.setTipoOperacion}
          precioVenta={form.precioVenta}
          precioRenta={form.precioRenta}
          moneda={form.moneda}
          setMoneda={form.setMoneda}
          tipoPrincipal={form.tipoPrincipal}
          setTipoPrincipal={form.setTipoPrincipal}
          subtipo={form.subtipo}
          setSubtipo={form.setSubtipo}
          handleCurrencyChange={form.handleCurrencyChange}
          setPrecioVenta={form.setPrecioVenta}
          setPrecioRenta={form.setPrecioRenta}
          errors={form.errors}
        />

        {/* 3. UBICACIÓN */}
        <LocationSection
          pais={form.pais}
          ubicacionData={form.ubicacionData}
          setUbicacionData={form.setUbicacionData}
          calle={form.calle}
          setCalle={form.setCalle}
          numeroExterior={form.numeroExterior}
          setNumeroExterior={form.setNumeroExterior}
          numeroInterior={form.numeroInterior}
          setNumeroInterior={form.setNumeroInterior}
          codigoPostal={form.codigoPostal}
          setCodigoPostal={form.setCodigoPostal}
          errors={form.errors}
        />

        {/* 4. CARACTERÍSTICAS FÍSICAS */}
        <PhysicalFeaturesSection
          tipoPrincipal={form.tipoPrincipal}
          subtipo={form.subtipo}
          tipoOperacion={form.tipoOperacion}
          camposVisibles={form.camposVisibles}
          recamaras={form.recamaras}
          setRecamaras={form.setRecamaras}
          banosCompletos={form.banosCompletos}
          setBanosCompletos={form.setBanosCompletos}
          mediosBanos={form.mediosBanos}
          setMediosBanos={form.setMediosBanos}
          estacionamientos={form.estacionamientos}
          setEstacionamientos={form.setEstacionamientos}
          m2Construccion={form.m2Construccion}
          setM2Construccion={form.setM2Construccion}
          m2Terreno={form.m2Terreno}
          setM2Terreno={form.setM2Terreno}
          niveles={form.niveles}
          setNiveles={form.setNiveles}
          antiguedad={form.antiguedad}
          setAntiguedad={form.setAntiguedad}
          amueblado={form.amueblado}
          setAmueblado={form.setAmueblado}
          petFriendly={form.petFriendly}
          setPetFriendly={form.setPetFriendly}
          errors={form.errors}
          clearError={form.clearError}
        />

        {/* 5. AMENIDADES */}
        <AmenitiesSection
          amenidadesSeleccionadas={form.amenidadesSeleccionadas}
          toggleAmenidad={form.toggleAmenidad}
        />

        {/* 6. PROPIETARIO */}
        <OwnerSection
          nombreCompletoPropietario={form.nombreCompletoPropietario}
          setNombreCompletoPropietario={form.setNombreCompletoPropietario}
          emailPropietario={form.emailPropietario}
          setEmailPropietario={form.setEmailPropietario}
          telefonoPropietario={form.telefonoPropietario}
          setTelefonoPropietario={form.setTelefonoPropietario}
        />

        {/* 7. COMISIÓN */}
        <CommissionSection
          tipoOperacion={form.tipoOperacion}
          moneda={form.moneda}
          setMoneda={form.setMoneda}
          handleCurrencyChange={form.handleCurrencyChange}
          ventaValues={{
            comparte: form.comparteComision,
            tipo: form.comisionTipo,
            valor: form.comisionValor,
            compartidaTipo: form.comisionCompartidaTipo,
            compartidaValor: form.comisionCompartidaValor,
            condiciones: form.condicionesComision,
          }}
          ventaSetters={{
            setComparte: form.setComparteComision,
            setTipo: form.setComisionTipo,
            setValor: form.setComisionValor,
            setCompartidaTipo: form.setComisionCompartidaTipo,
            setCompartidaValor: form.setComisionCompartidaValor,
            setCondiciones: form.setCondicionesComision,
          }}
          rentaValues={{
            comparte: form.comparteComisionRenta,
            tipo: form.comisionTipoRenta,
            valor: form.comisionValorRenta,
            compartidaTipo: form.comisionCompartidaTipoRenta,
            compartidaValor: form.comisionCompartidaValorRenta,
            condiciones: form.condicionesComisionRenta,
          }}
          rentaSetters={{
            setComparte: form.setComparteComisionRenta,
            setTipo: form.setComisionTipoRenta,
            setValor: form.setComisionValorRenta,
            setCompartidaTipo: form.setComisionCompartidaTipoRenta,
            setCompartidaValor: form.setComisionCompartidaValorRenta,
            setCondiciones: form.setCondicionesComisionRenta,
          }}
        />

        {/* 8. GRAVAMEN Y FINANCIAMIENTO */}
        <GravamenFinancingSection
          tieneGravamen={form.tieneGravamen}
          setTieneGravamen={form.setTieneGravamen}
          institucionGravamen={form.institucionGravamen}
          setInstitucionGravamen={form.setInstitucionGravamen}
          montoGravamen={form.montoGravamen}
          setMontoGravamen={form.setMontoGravamen}
          handleCurrencyChange={form.handleCurrencyChange}
          aceptaFinanciamiento={form.aceptaFinanciamiento}
          setAceptaFinanciamiento={form.setAceptaFinanciamiento}
          tiposFinanciamientoSeleccionados={
            form.tiposFinanciamientoSeleccionados
          }
          toggleFinanciamiento={form.toggleFinanciamiento}
        />

        {/* 9. MAPA */}
        <MapSection
          location={form.location}
          setLocation={form.setLocation}
          mapCenter={form.mapCenter}
          error={form.errors.location}
        />
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
      <ProgressModal publishState={publishState} onCancel={cancelPublish} />

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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
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
