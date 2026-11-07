import React, { useEffect, useState } from "react";
import { Alert, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { reportService } from "@/services/reportService";

/**
 * REV24: triangulo amarillo en la tarjeta del feed cuando la propiedad tiene reportes. Lo ve cualquier asesor
 * (incluido quien publico). Al tocarlo muestra motivo, descripcion y quien reporto.
 * Solo vive en la app: la ficha compartida (enlace y PDF) no lo incluye.
 */
export function ReportBadge({ propertyId }: { propertyId: string }) {
  const [reportes, setReportes] = useState<any[]>([]);

  useEffect(() => {
    let vivo = true;
    if (!propertyId) return;
    reportService
      .getReportsDetailed(propertyId)
      .then((r) => {
        if (vivo) setReportes(r ?? []);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [propertyId]);

  if (!reportes.length) return null;

  const mostrar = () => {
    const detalle = reportes
      .map(
        (r, i) =>
          `${i + 1}. ${r.motivo}${r.descripcion ? `: ${r.descripcion}` : ""}${r.reportante ? `\n    Report\u00f3: ${r.reportante}` : ""}`,
      )
      .join("\n\n");
    Alert.alert(
      reportes.length === 1 ? "Esta propiedad tiene 1 reporte" : `Esta propiedad tiene ${reportes.length} reportes`,
      detalle,
    );
  };

  return (
    <Pressable
      onPress={mostrar}
      hitSlop={10}
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#F5C518",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 6,
      }}
    >
      <Ionicons name="warning" size={16} color="#3b2f00" />
    </Pressable>
  );
}

export default ReportBadge;
