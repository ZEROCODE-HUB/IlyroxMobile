import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";

interface Props {
    apiKey: string;
    setApiKey: (key: string) => void;
    onSave: () => void;
    loading: boolean;
}

export const EasyBrokerOnboarding: React.FC<Props> = ({
    apiKey,
    setApiKey,
    onSave,
    loading,
}) => {
    const [showApiKey, setShowApiKey] = useState(false);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0} // Adjustment for header
        >
            <ScrollView contentContainerStyle={styles.onboardingContainer} keyboardShouldPersistTaps="handled">
                <View style={styles.onboardingContent}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="cloud-upload" size={48} color={COLORS.primary} />
                    </View>

                    <Text style={styles.onboardingTitle}>Sincroniza tus propiedades</Text>

                    <Text style={styles.onboardingSubtitle}>
                        Conecta tu cuenta de EasyBroker para importar automáticamente todas
                        tus propiedades publicadas
                    </Text>

                    <View style={styles.onboardingForm}>
                        <Text style={styles.inputLabel}>API Key de EasyBroker</Text>

                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="Pega tu API Key aquí"
                                value={apiKey}
                                onChangeText={setApiKey}
                                secureTextEntry={!showApiKey}
                                autoCapitalize="none"
                                autoCorrect={false}
                                placeholderTextColor={COLORS.textTertiary}
                            />
                            <TouchableOpacity
                                style={styles.inputIcon}
                                onPress={() => setShowApiKey(!showApiKey)}
                            >
                                <Ionicons
                                    name={showApiKey ? "eye-off" : "eye"}
                                    size={22}
                                    color={COLORS.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={onSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <>
                                    <Text style={styles.primaryButtonText}>
                                        Conectar y Sincronizar
                                    </Text>
                                    <Ionicons
                                        name="arrow-forward"
                                        size={20}
                                        color={COLORS.white}
                                    />
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.helpButton}
                            onPress={() => Linking.openURL("https://dev.easybroker.com/docs/api-de-easybroker")}
                        >
                            <Ionicons
                                name="help-circle-outline"
                                size={18}
                                color={COLORS.primary}
                            />
                            <Text style={styles.helpText}>¿Dónde encuentro mi API Key?</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.benefitsList}>
                        <View style={styles.benefitItem}>
                            <Ionicons
                                name="checkmark-circle"
                                size={24}
                                color={COLORS.success}
                            />
                            <Text style={styles.benefitText}>Sincronización automática</Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Ionicons
                                name="checkmark-circle"
                                size={24}
                                color={COLORS.success}
                            />
                            <Text style={styles.benefitText}>
                                Actualización en tiempo real
                            </Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Ionicons
                                name="checkmark-circle"
                                size={24}
                                color={COLORS.success}
                            />
                            <Text style={styles.benefitText}>100% seguro</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    onboardingContainer: {
        flexGrow: 1,
        padding: 24,
    },
    onboardingContent: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-start", // Changed from center to flex-start
        paddingVertical: 20, // Reduced padding
    },
    iconCircle: {
        width: 80, // Reduced size
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.infoLight, // Replaced #E3F2FD
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    onboardingTitle: {
        fontSize: 24, // Reduced font size
        fontWeight: "bold",
        color: COLORS.textPrimary,
        textAlign: "center",
        marginBottom: 8,
    },
    onboardingSubtitle: {
        fontSize: 15, // Reduced font size
        color: COLORS.textSecondary,
        textAlign: "center",
        lineHeight: 22,
        paddingHorizontal: 10,
        marginBottom: 24,
    },
    benefitsList: {
        gap: 16,
        width: "100%", // Ensure full width
        marginTop: 24, // Add spacing from form
        paddingHorizontal: 8,
    },
    benefitItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    benefitText: {
        fontSize: 15,
        color: COLORS.textPrimary,
        fontWeight: "500",
    },
    onboardingForm: {
        width: "100%",
        paddingBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    inputWrapper: {
        position: "relative",
        marginBottom: 16,
    },
    input: {
        backgroundColor: COLORS.white,
        borderWidth: 2,
        borderColor: COLORS.cardBorder,
        borderRadius: 16,
        padding: 16,
        paddingRight: 50,
        fontSize: 15,
        color: COLORS.textPrimary,
    },
    inputIcon: {
        position: "absolute",
        right: 16,
        top: 16,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        borderRadius: 16,
        gap: 8,
        marginBottom: 16,
    },
    primaryButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: "700",
    },
    helpButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: 12,
    },
    helpText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: "500",
    },
});
