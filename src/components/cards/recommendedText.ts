import type { User } from "../../types";

/**
 * Construye el texto del indicador de recomendaciones que se muestra en el feed
 * (PostCard / ReelCard). Si el autor tiene `ocupacion`, se menciona el tipo de
 * profesional; si no, se mantiene el texto histórico con el nombre del recomendador.
 */
export function buildRecommendedText(user: User): string {
  const positive = user.positiveRecommendations ?? 0;
  const first = (user.recommendedByPreview ?? [])[0];
  const ocupacion = user.ocupacion?.trim();

  const names = first
    ? `${first.name}${positive > 1 ? ` y ${positive - 1} más` : ""}`
    : null;

  if (ocupacion) {
    const verbo = positive > 1 ? "recomiendan" : "recomienda";
    return names
      ? `${names} ${verbo} a este ${ocupacion}`
      : `Recomiendan a este ${ocupacion}`;
  }

  // Sin ocupación → comportamiento actual
  return names ?? `Recomendado por ${positive} usuarios`;
}
