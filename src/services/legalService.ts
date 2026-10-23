/**
 * legalService - documentos legales versionados + evidencia de consentimientos + reportes.
 *
 * Todo vive en Supabase (SQL 11_legal_evidencia.sql):
 *  - El TEXTO que ve la persona en el popup sale de la BD, de la misma version que queda
 *    registrada como evidencia (no hay textos duplicados dentro de la app).
 *  - Las aceptaciones se guardan con version + hash + fecha + origen (append-only).
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";

export type LegalCodigo =
  | "terminos"
  | "privacidad"
  | "comunidad"
  | "seguridad_infantil"
  | "comunicaciones";

export type LegalBloqueTipo = "h1" | "sub" | "kv" | "h2" | "p";
export type LegalBloque = [LegalBloqueTipo, string];

export interface LegalDocumento {
  codigo: LegalCodigo;
  version: string;
  titulo: string;
  sha256: string;
  url_app: string | null;
  fecha_documento: string | null;
  es_vigente: boolean;
  bloques: LegalBloque[];
}

export interface LegalDocumentoResumen {
  codigo: LegalCodigo;
  version: string;
  titulo: string;
  url_app: string | null;
  fecha_documento: string | null;
}

export type ConsentTipo =
  | "terminos"
  | "privacidad_leida"
  | "mayoria_edad"
  | "marketing"
  | "comunidad"
  | "seguridad_infantil"
  | "prospecto_aviso"
  | "prospecto_compartir_asesores";

export interface ConsentItem {
  tipo: ConsentTipo;
  accion?: "aceptado" | "revocado" | "rechazado";
  lead_id?: string | null;
  contexto?: Record<string, unknown>;
}

export type ReporteTipo = "usuario" | "publicacion" | "reel" | "propiedad" | "chat";

const cacheDocs = new Map<string, LegalDocumento>();
let versionesMostradas: Record<string, string> = {};

/** Datos tecnicos para la evidencia (no incluye datos personales). */
export function contextoCliente(): Record<string, unknown> {
  return {
    plataforma: Platform.OS,
    so_version: String(Platform.Version ?? ""),
    app_version: Constants.expoConfig?.version ?? null,
    versiones_mostradas: versionesMostradas,
  };
}

export const legalService = {
  /** Lista de documentos vigentes (sin texto). Guarda las versiones que la app mostro. */
  async listarDocumentos(): Promise<LegalDocumentoResumen[]> {
    const { data, error } = await supabase.rpc("legal_listar_documentos");
    if (error) throw error;
    const lista = (Array.isArray(data) ? data : []) as LegalDocumentoResumen[];
    versionesMostradas = Object.fromEntries(lista.map((d) => [d.codigo, d.version]));
    return lista;
  },

  /** Texto completo del documento vigente (o de una version concreta). */
  async obtenerDocumento(codigo: LegalCodigo, version?: string): Promise<LegalDocumento> {
    const key = `${codigo}|${version ?? "vigente"}`;
    const hit = cacheDocs.get(key);
    if (hit) return hit;
    const { data, error } = await supabase.rpc("legal_obtener_documento", {
      p_codigo: codigo,
      p_version: version ?? null,
    });
    if (error) throw error;
    if (!data) throw new Error("Documento no disponible");
    const doc = data as LegalDocumento;
    cacheDocs.set(key, doc);
    if (doc.es_vigente) versionesMostradas = { ...versionesMostradas, [doc.codigo]: doc.version };
    return doc;
  },

  /** Registra evidencia de aceptaciones / revocaciones del usuario autenticado. */
  async registrarConsentimientos(
    items: ConsentItem[],
    origen: string,
    contexto: Record<string, unknown> = {},
  ): Promise<number> {
    const { data, error } = await supabase.rpc("legal_registrar_consentimientos", {
      p_items: items,
      p_origen: origen,
      p_contexto: { ...contextoCliente(), ...contexto },
    });
    if (error) throw error;
    return Number((data as { registrados?: number } | null)?.registrados ?? 0);
  },

  /** Ultima accion por tipo (p. ej. marketing -> aceptado/revocado). */
  async estadoUsuario(): Promise<Record<string, { accion: string; version: string; documento: string; fecha: string }>> {
    const { data, error } = await supabase.rpc("legal_estado_usuario");
    if (error) throw error;
    return (data ?? {}) as Record<string, { accion: string; version: string; documento: string; fecha: string }>;
  },

  /** Reporta un usuario, publicacion, reel, propiedad o chat. */
  async reportarContenido(args: {
    tipo: ReporteTipo;
    objetivoId?: string | null;
    usuarioReportadoId?: string | null;
    motivo: string;
    descripcion?: string | null;
    conversacionId?: string | null;
  }): Promise<{ id: string; duplicado: boolean }> {
    const { data, error } = await supabase.rpc("reportar_a_moderacion", {
      p_tipo: args.tipo,
      p_objetivo_id: args.objetivoId ?? null,
      p_usuario_reportado_id: args.usuarioReportadoId ?? null,
      p_motivo: args.motivo,
      p_descripcion: args.descripcion ?? null,
      p_conversacion_id: args.conversacionId ?? null,
    });
    if (error) throw error;
    return data as { id: string; duplicado: boolean };
  },
};
