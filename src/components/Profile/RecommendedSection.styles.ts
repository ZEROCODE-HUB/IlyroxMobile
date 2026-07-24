import { StyleSheet } from "react-native";
import { COLORS } from "@/constants";

// Estilos compartidos por RecommendedSection y RecommendedModal.
// Viven en su propio archivo para evitar un require cycle entre ambos
// componentes (Section importa el Modal, y el Modal necesitaba estos estilos).
export const stylesRecommendedSection = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
  },
  recommendedBySection: {
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  recommendedByHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  recommendedByTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  recommendedByCount: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  recommendedByLoading: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendedByEmptyText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  recommendedByPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recommendedByAvatars: {
    flexDirection: "row",
    alignItems: "center",
    width: 46,
  },
  recommendedByAvatarWrap: {
    borderRadius: 999,
    backgroundColor: COLORS.white,
  },
  recommendedByAvatarWrapSecond: {
    marginLeft: -10,
  },
  recommendedByAvatarSmall: {
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  recommendedByPreviewText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  recommendedByModalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  recommendedByModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  recommendedByModalBackBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendedByModalTitleWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  recommendedByModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  recommendedByModalSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  recommendedByModalList: {
    padding: 16,
    paddingBottom: 30,
  },
  recommendedByModalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  recommendedByAvatar: {
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  recommendedByInfo: {
    flex: 1,
    justifyContent: "center",
  },
  recommendedByName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  recommendedByRole: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  recommendedByModalFooter: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendedByLoadMoreBtn: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  recommendedByLoadMoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  recommendedByModalEmpty: {
    padding: 20,
    alignItems: "center",
  },
  progressSection: {
    marginTop: 16,
    gap: 8,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressLabel: {
    width: 80,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  progressPerc: {
    width: 40,
    textAlign: "right",
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  featuresSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  featureLabel: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  featureStars: {
    flexDirection: "row",
    gap: 4,
  },
});
