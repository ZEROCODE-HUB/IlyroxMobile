import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../AppHeader";
import CreatePost from "./CreatePost";
import CreateReel from "./CreateReel";
import CreateProperty from "./CreateProperty";
import { COLORS } from "../../constants/colors";
import { ScreenWrapper } from "../../screens/ScreenWrapper";

type ContentType = "post" | "reel" | "property" | null;

export default function CreateContent() {
  const navigation = useNavigation<any>();
  const [contentType, setContentType] = useState<ContentType>(null);

  // Si se seleccionó un tipo, mostrar el formulario correspondiente
  if (contentType === "post") {
    return <CreatePost onBack={() => setContentType(null)} />;
  }

  if (contentType === "reel") {
    return <CreateReel onBack={() => setContentType(null)} />;
  }

  if (contentType === "property") {
    return <CreateProperty onBack={() => setContentType(null)} />;
  }

  // Pantalla de selección
  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      <AppHeader
        title="Crear contenido"
        showBackButton
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.optionsContainer}>
          {/* Opción: Post */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setContentType("post")}
            accessibilityLabel="Publicar post"
            accessibilityRole="button"
          >
            <View
              style={[
                styles.optionIcon,
                { backgroundColor: COLORS.primaryTransparent },
              ]}
            >
              <Ionicons name="document-text" size={32} color={COLORS.primary} />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Publicar Post</Text>
              <Text style={styles.optionDescription}>
                Comparte texto o imágenes con tu red
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.textTertiary}
            />
          </TouchableOpacity>

          {/* Opción: Reel */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setContentType("reel")}
            accessibilityLabel="Publicar reel"
            accessibilityRole="button"
          >
            <View
              style={[
                styles.optionIcon,
                { backgroundColor: COLORS.primaryTransparent },
              ]}
            >
              <Ionicons name="videocam" size={32} color={COLORS.primary} />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Publicar Reel</Text>
              <Text style={styles.optionDescription}>
                Sube un video corto y dinámico
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.textTertiary}
            />
          </TouchableOpacity>

          {/* Opción: Propiedad */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setContentType("property")}
            accessibilityLabel="Publicar propiedad"
            accessibilityRole="button"
          >
            <View
              style={[
                styles.optionIcon,
                { backgroundColor: COLORS.primaryTransparent },
              ]}
            >
              <Ionicons name="home" size={32} color={COLORS.primary} />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Publicar Propiedad</Text>
              <Text style={styles.optionDescription}>
                Crea una ficha inmobiliaria profesional
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    height: 60,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
