import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AppHeader } from "./AppHeader";
import { GoogleCalendarIcon } from "./shared/GoogleCalendarIcon";
import { RatingModal } from "./RatingModal";
import { COLORS } from "../constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useAppointments } from "../hooks/useAppointments";
import AppointmentTabs from "./Appointments/AppointmentTabs";
import AppointmentList from "./Appointments/AppointmentList";
import CreateAppointmentModal from "./Appointments/CreateAppointmentModal";
import { SafePressable } from "@/design-system";

const Appointments: React.FC = () => {
  const insets = useSafeAreaInsets();
  const safeStyle = {
    paddingBottom: Math.max(insets.bottom, 10),
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };
  const { profile } = useAuth();
  const {
    connect,
    disconnect,
    isConnected,
    loading: calendarLoading,
  } = useGoogleCalendar(profile?.id);
  const {
    activeTab,
    setActiveTab,
    appointments,
    loading,
    showRateModal,
    editingAppointment,
    handleMarkCancel,
    handleAcceptAppointment,
    handleOpenRating,
    handleEditAppointment,
    handleSyncCalendar,
    handleSubmitRating,
    handleAppointmentUpdated,
    handleContactPress,
    handlePropertyPress,
    handleUserPress,
    closeRatingModal,
    closeEditModal,
    rateTarget,
  } = useAppointments();

  return (
    <View style={[styles.container, safeStyle]}>
      <AppHeader
        title="Citas"
        showBackButton
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.calendarPanel}>
          <View style={styles.calendarHeader}>
            <View style={styles.calendarIconBox}>
              <GoogleCalendarIcon size={22} />
            </View>
            <View style={styles.calendarPanelText}>
              <Text style={styles.calendarTitle}>Google Calendar</Text>
              <Text style={styles.calendarSubtitle}>
                {isConnected
                  ? "Tus citas se sincronizan automáticamente con tu calendario."
                  : "Conecta tu cuenta para guardar tus citas y crear enlaces de Meet."}
              </Text>
            </View>
          </View>

          {isConnected ? (
            <View style={styles.connectedRow}>
              <View style={styles.connectedPill}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={COLORS.successDark}
                />
                <Text style={styles.connectedPillText}>Conectado</Text>
              </View>
              <SafePressable
                onPress={disconnect}
                disabled={calendarLoading}
                hitSlop={8}
              >
                <Text style={styles.disconnectText}>Desconectar</Text>
              </SafePressable>
            </View>
          ) : (
            <SafePressable
              style={[
                styles.connectButton,
                calendarLoading && styles.connectButtonDisabled,
              ]}
              onPress={() => {
                  void connect();
                }}
              disabled={calendarLoading}
            >
              {calendarLoading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="link-outline" size={18} color={COLORS.white} />
              )}
              <Text style={styles.connectButtonText}>
                Conectar Google Calendar
              </Text>
            </SafePressable>
          )}
        </View>

        <AppointmentTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <AppointmentList
          loading={loading}
          appointments={appointments}
          activeTab={activeTab}
          onMarkCancel={handleMarkCancel}
          onAcceptAppointment={handleAcceptAppointment}
          onOpenRating={handleOpenRating}
          onSyncCalendar={handleSyncCalendar}
          onContact={handleContactPress}
          onEdit={handleEditAppointment}
          currentUserId={profile?.id}
          onPropertyPress={handlePropertyPress}
          onUserPress={handleUserPress}
        />
      </ScrollView>

      <RatingModal
        visible={showRateModal}
        onClose={closeRatingModal}
        onSubmit={handleSubmitRating}
        target={rateTarget}
      />

      <CreateAppointmentModal
        visible={!!editingAppointment}
        onClose={closeEditModal}
        currentUserId={profile?.id ?? ""}
        mode="edit"
        appointment={editingAppointment}
        onSaved={handleAppointmentUpdated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  calendarPanel: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  calendarIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryTransparent,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarPanelText: {
    flex: 1,
  },
  calendarTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  calendarSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  connectButton: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },
  connectedRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  connectedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  connectedPillText: {
    color: COLORS.successDark,
    fontSize: 13,
    fontWeight: "700",
  },
  disconnectText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
});

export default Appointments;