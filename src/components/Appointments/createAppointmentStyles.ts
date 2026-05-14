import { StyleSheet, Dimensions } from "react-native";
import { COLORS } from "../../constants";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export const createAppointmentStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "flex-end",
    },
    overlayBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    keyboardView: {
        flex: 1,
        justifyContent: "flex-end",
    },
    container: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: SCREEN_HEIGHT * 0.85,
    },
    handleContainer: {
        alignItems: "center",
        paddingVertical: 10,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: "#E0E0E0",
        borderRadius: 2,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.dividerGray,
    },
    headerTitle: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    closeButton: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    field: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: 10,
    },
    optionalLabel: {
        fontWeight: "400",
        color: COLORS.textTertiary,
    },
    textArea: {
        backgroundColor: COLORS.lightGray,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.mediumGray,
        padding: 14,
        fontSize: 14,
        color: COLORS.textPrimary,
        minHeight: 100,
    },
    footer: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.dividerGray,
        backgroundColor: COLORS.white,
    },
    button: {
        flex: 1,
        flexDirection: "row",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    buttonSecondary: {
        backgroundColor: "#F3F4F6",
    },
    buttonSecondaryText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    buttonPrimary: {
        backgroundColor: COLORS.primary,
    },
    buttonPrimaryText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.white,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});
