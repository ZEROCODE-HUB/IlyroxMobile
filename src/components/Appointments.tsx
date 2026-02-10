import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { AppHeader } from "./AppHeader";
import { RatingModal } from "./RatingModal";
import { COLORS } from "../constants/colors";
import { ScreenWrapper } from "@/screens/ScreenWrapper";
import { router } from "expo-router";
import { useAppointments } from "../hooks/hooks/useAppointments";
import AppointmentTabs from "./Appointments/AppointmentTabs";
import AppointmentList from "./Appointments/AppointmentList";

const Appointments: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    appointments,
    loading,
    showRateModal,
    handleMarkComplete,
    handleMarkCancel,
    handleOpenRating,
    handleSubmitRating,
    handleContactPress,
    handlePropertyPress,
    handleUserPress,
    closeRatingModal,
  } = useAppointments();

  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      <AppHeader
        title="Citas"
        showBackButton
        onBack={() => router.push("/(tabs)")}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppointmentTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <AppointmentList
          loading={loading}
          appointments={appointments}
          activeTab={activeTab}
          onMarkComplete={handleMarkComplete}
          onMarkCancel={handleMarkCancel}
          onOpenRating={handleOpenRating}
          onContact={handleContactPress}
          onPropertyPress={handlePropertyPress}
          onUserPress={handleUserPress}
        />
      </ScrollView>

      <RatingModal
        visible={showRateModal}
        onClose={closeRatingModal}
        onSubmit={handleSubmitRating}
      />
    </ScreenWrapper>
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
});

export default Appointments;
