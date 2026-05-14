/**
 * conversationsService.ts
 * Acceso a datos de conversaciones agrupadas. Toda la lógica de fetch y
 * combinación (agrupaciones + conversaciones + etiquetas) vive aquí.
 */

import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";

const log = logger.scoped("conversationsService");

export interface ConversationTag {
  id: string;
  nombre: string;
  color: string;
}

export interface ConversationOtherUser {
  id: string;
  nombre: string;
  apellido_paterno: string;
  foto: string | null;
}

export interface GroupedConversation {
  id: string;
  usuario1_id: string;
  usuario2_id: string;
  total_conversaciones: number;
  total_mensajes_no_leidos: number;
  conversacion_mas_reciente_id: string | null;
  ultimo_mensaje_preview: string | null;
  ultima_actividad: string | null;
  other_user: ConversationOtherUser;
  etiquetas: ConversationTag[];
}

export interface ConversationForUser {
  id: string;
  propiedad_id: string | null;
  propiedad:
    | {
        id: string;
        tipo: string;
        subtipo: string;
        ciudad: string;
        precio: number;
        moneda: string;
        imagenes: string[];
      }
    | null;
  unread_count: number;
  ultimo_mensaje_preview: string | null;
  ultimo_mensaje_en: string | null;
}

function buildTagsMap(
  rows: Array<{ conversacion_id: string; etiqueta: ConversationTag }>,
) {
  const map = new Map<string, ConversationTag[]>();
  for (const row of rows) {
    if (!row.etiqueta) continue;
    const existing = map.get(row.conversacion_id) || [];
    if (!existing.find((t) => t.id === row.etiqueta.id)) {
      existing.push(row.etiqueta);
    }
    map.set(row.conversacion_id, existing);
  }
  return map;
}

function mostRecent(convs: any[]) {
  return convs.reduce((latest, current) => {
    if (!latest) return current;
    if (!current.ultimo_mensaje_en) return latest;
    if (!latest.ultimo_mensaje_en) return current;
    return new Date(current.ultimo_mensaje_en) >
      new Date(latest.ultimo_mensaje_en)
      ? current
      : latest;
  }, null as any);
}

function countUnread(convs: any[], userId: string) {
  return convs.reduce((total, conv) => {
    const isUsuario1 = conv.usuario1_id === userId;
    const count = isUsuario1
      ? conv.mensajes_no_leidos_usuario1
      : conv.mensajes_no_leidos_usuario2;
    return total + (count || 0);
  }, 0);
}

export const conversationsService = {
  async listConversations(userId: string): Promise<GroupedConversation[]> {
    const { data: agrupaciones, error: fetchError } = await supabase
      .from("agrupaciones_conversaciones")
      .select(
        `
        *,
        usuario1:perfiles!usuario1_id(id, nombre, apellido_paterno, foto),
        usuario2:perfiles!usuario2_id(id, nombre, apellido_paterno, foto),
        conversacion_mas_reciente:conversaciones!conversacion_mas_reciente_id(
          ultimo_mensaje_preview,
          ultimo_mensaje_en
        )
      `,
      )
      .or(`usuario1_id.eq.${userId},usuario2_id.eq.${userId}`)
      .order("ultima_actividad", { ascending: false });

    if (fetchError) {
      log.error("listConversations failed", fetchError);
      throw fetchError;
    }

    const { data: allConversations } = await supabase
      .from("conversaciones")
      .select(
        "id, usuario1_id, usuario2_id, mensajes_no_leidos_usuario1, mensajes_no_leidos_usuario2, ultimo_mensaje_en, ultimo_mensaje_preview",
      )
      .or(`usuario1_id.eq.${userId},usuario2_id.eq.${userId}`);

    const conversationIds = (allConversations || []).map((c) => c.id);

    const { data: conversationTags } =
      conversationIds.length > 0
        ? await supabase
            .from("conversacion_etiquetas")
            .select(
              `
                conversacion_id,
                etiqueta:etiquetas_conversacion(id, nombre, color)
              `,
            )
            .in("conversacion_id", conversationIds)
        : { data: [] };

    const tagsMap = buildTagsMap((conversationTags || []) as any);

    const processed: GroupedConversation[] = (agrupaciones || []).map(
      (group: any) => {
        const isUsuario1 = group.usuario1_id === userId;
        const otherUser = isUsuario1 ? group.usuario2 : group.usuario1;

        const groupConvs = (allConversations || []).filter(
          (c: any) =>
            (c.usuario1_id === group.usuario1_id &&
              c.usuario2_id === group.usuario2_id) ||
            (c.usuario1_id === group.usuario2_id &&
              c.usuario2_id === group.usuario1_id),
        );

        const latestConvInGroup = mostRecent(groupConvs);
        const unreadCount = countUnread(groupConvs, userId);

        const allTags = new Map<string, ConversationTag>();
        groupConvs.forEach((conv) => {
          (tagsMap.get(conv.id) || []).forEach((tag) => {
            allTags.set(tag.id, tag);
          });
        });

        return {
          id:
            group.conversacion_mas_reciente_id ||
            `${group.usuario1_id}_${group.usuario2_id}`,
          usuario1_id: group.usuario1_id,
          usuario2_id: group.usuario2_id,
          total_conversaciones: group.total_conversaciones,
          total_mensajes_no_leidos: unreadCount,
          conversacion_mas_reciente_id:
            latestConvInGroup?.id || group.conversacion_mas_reciente_id,
          ultimo_mensaje_preview:
            latestConvInGroup?.ultimo_mensaje_preview ||
            group.conversacion_mas_reciente?.ultimo_mensaje_preview ||
            null,
          ultima_actividad:
            latestConvInGroup?.ultimo_mensaje_en ||
            group.ultima_actividad ||
            null,
          other_user: otherUser,
          etiquetas: Array.from(allTags.values()),
        };
      },
    );

    processed.sort((a, b) => {
      const dateA = new Date(a.ultima_actividad || 0).getTime();
      const dateB = new Date(b.ultima_actividad || 0).getTime();
      return dateB - dateA;
    });

    return processed;
  },

  async getConversationsForUser(
    userId: string,
    otherUserId: string,
  ): Promise<ConversationForUser[]> {
    const { data, error } = await supabase
      .from("conversaciones")
      .select(
        `
        *,
        propiedad:propiedades(id, tipo, subtipo, ciudad, fotos, operaciones_propiedad(precio, moneda))
      `,
      )
      .or(
        `and(usuario1_id.eq.${userId},usuario2_id.eq.${otherUserId}),and(usuario1_id.eq.${otherUserId},usuario2_id.eq.${userId})`,
      )
      .order("ultimo_mensaje_en", { ascending: false });

    if (error) {
      log.error("getConversationsForUser failed", error);
      return [];
    }

    return (data || []).map((conv: any) => {
      const isUsuario1 = conv.usuario1_id === userId;
      const unreadCount = isUsuario1
        ? conv.mensajes_no_leidos_usuario1
        : conv.mensajes_no_leidos_usuario2;

      let propiedad: ConversationForUser["propiedad"] = null;
      if (conv.propiedad) {
        const operation = conv.propiedad.operaciones_propiedad?.[0];
        propiedad = {
          id: conv.propiedad.id,
          tipo: conv.propiedad.tipo,
          subtipo: conv.propiedad.subtipo,
          ciudad: conv.propiedad.ciudad,
          precio: operation?.precio || 0,
          moneda: operation?.moneda || "MXN",
          imagenes: conv.propiedad.fotos || [],
        };
      }

      return {
        id: conv.id,
        propiedad_id: conv.propiedad_id,
        propiedad,
        unread_count: unreadCount || 0,
        ultimo_mensaje_preview: conv.ultimo_mensaje_preview,
        ultimo_mensaje_en: conv.ultimo_mensaje_en,
      };
    });
  },
};
