import { perfiles } from "@/types";

export const formatFullName = (p: perfiles | null): string => {
  if (!p) return "Usuario";
  const parts = [p.nombre, p.apellido_paterno, p.apellido_materno].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(" ") : p.nombre_completo || "Usuario";
};

export const formatPhoneNumber = (
  prefix: string | null,
  number: string | null,
): string => {
  if (!number) return "No especificado";
  if (prefix) return `${prefix} ${number}`;
  return number;
};

export const formatLocation = (estado: string | null, pais: string): string => {
  if (!estado) return pais || "No especificada";
  return `${estado}, ${pais}`;
};

const ROLE_LABELS: Record<string, string> = {
  agente: "Agente",
  cliente: "Cliente",
  admin: "Admin",
};

export const formatRole = (rol: string): string => ROLE_LABELS[rol] || rol;
