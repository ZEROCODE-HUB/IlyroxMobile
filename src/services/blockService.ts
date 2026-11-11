import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";

const log = logger.scoped("blockService");

export interface BlockedUser {
  id: string;
  nombre: string;
  avatar?: string | null;
  ocupacion?: string | null;
  blockedAt?: string | null;
}

interface CacheEntry {
  todos: string[];
  yoBloquee: string[];
  expires: number;
}

const blockedUsersCache = new Map<string, CacheEntry>();
// REV27: TTL corto; si OTRO usuario te bloquea, el cambio debe verse pronto.
const CACHE_TTL_MS = 15 * 1000; // REV28: un bloqueo hecho por el otro usuario debe notarse en segundos

function invalidateBlockedUsersCache(blockerId: string) {
  blockedUsersCache.delete(blockerId);
}

/**
 * REV27: bloqueos en AMBOS sentidos.
 *  - todos:     ids con los que hay un bloqueo (yo los bloquee O ellos me bloquearon). Se usa para ocultar contenido.
 *  - yoBloquee: solo los que yo bloquee (para mostrar su nombre en el buscador y poder desbloquear).
 * Usa la funcion SQL mis_bloqueos() (ve ambos sentidos aunque la RLS solo deje leer los propios). Si no existe,
 * cae a la lectura directa de la tabla.
 */
async function cargarBloqueos(userId: string): Promise<{ todos: string[]; yoBloquee: string[] }> {
  const cached = blockedUsersCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    return { todos: cached.todos, yoBloquee: cached.yoBloquee };
  }

  let yo: string[] = [];
  let otros: string[] = [];

  const { data, error } = await supabase.rpc("mis_bloqueos");
  if (!error && Array.isArray(data)) {
    for (const r of data as any[]) {
      if (!r?.otro_id) continue;
      if (r.yo_bloquee) yo.push(r.otro_id);
      else otros.push(r.otro_id);
    }
  } else {
    const q1 = await supabase.from("bloqueos_usuarios").select("bloqueado_id").eq("bloqueador_id", userId);
    if (q1.error) {
      log.warn("cargarBloqueos failed", q1.error);
      return { todos: [], yoBloquee: [] };
    }
    yo = (q1.data ?? []).map((r: any) => r.bloqueado_id).filter(Boolean);
    const q2 = await supabase.from("bloqueos_usuarios").select("bloqueador_id").eq("bloqueado_id", userId);
    if (!q2.error) otros = (q2.data ?? []).map((r: any) => r.bloqueador_id).filter(Boolean);
  }

  const todos = Array.from(new Set([...yo, ...otros]));
  const yoBloquee = Array.from(new Set(yo));
  blockedUsersCache.set(userId, { todos, yoBloquee, expires: Date.now() + CACHE_TTL_MS });
  return { todos, yoBloquee };
}

export const blockService = {
  // REV27: ids ocultos en ambos sentidos (yo los bloquee o me bloquearon).
  async getBlockedUserIds(blockerId?: string | null): Promise<string[]> {
    if (!blockerId) return [];
    return (await cargarBloqueos(blockerId)).todos;
  },

  // REV27: solo los que YO bloquee.
  async getBlockedByMeIds(blockerId?: string | null): Promise<string[]> {
    if (!blockerId) return [];
    return (await cargarBloqueos(blockerId)).yoBloquee;
  },

  async getBlockSets(blockerId?: string | null): Promise<{ todos: string[]; yoBloquee: string[] }> {
    if (!blockerId) return { todos: [], yoBloquee: [] };
    return cargarBloqueos(blockerId);
  },

  async getBlockedUsers(blockerId?: string | null): Promise<BlockedUser[]> {
    if (!blockerId) return [];

    const { data: blocks, error: blocksError } = await supabase
      .from("bloqueos_usuarios")
      .select("bloqueado_id,created_at")
      .eq("bloqueador_id", blockerId)
      .order("created_at", { ascending: false });

    if (blocksError) {
      log.warn("getBlockedUsers failed", blocksError);
      return [];
    }

    const blockedIds = (blocks ?? [])
      .map((row: any) => row.bloqueado_id)
      .filter(Boolean) as string[];

    if (blockedIds.length === 0) return [];

    const { data: profiles, error: profilesError } = await supabase
      .from("perfiles")
      .select("id,nombre,nombre_completo,apellido_paterno,apellido_materno,foto,ocupacion")
      .in("id", blockedIds);

    if (profilesError) {
      log.warn("getBlockedUsers profiles failed", profilesError);
      return blockedIds.map((id) => ({
        id,
        nombre: "Usuario bloqueado",
        blockedAt:
          (blocks ?? []).find((row: any) => row.bloqueado_id === id)
            ?.created_at ?? null,
      }));
    }

    const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return blockedIds.map((id) => {
      const profile = profileById.get(id);
      const block = (blocks ?? []).find((row: any) => row.bloqueado_id === id);
      const nombre =
        profile?.nombre_completo ||
        [profile?.nombre, profile?.apellido_paterno, profile?.apellido_materno]
          .filter(Boolean)
          .join(" ") ||
        "Usuario bloqueado";

      return {
        id,
        nombre,
        avatar: profile?.foto ?? null,
        ocupacion: profile?.ocupacion ?? null,
        blockedAt: block?.created_at ?? null,
      };
    });
  },

  async isBlocked(blockerId?: string | null, blockedId?: string | null) {
    if (!blockerId || !blockedId || blockerId === blockedId) return false;

    const { data, error } = await supabase
      .from("bloqueos_usuarios")
      .select("bloqueado_id")
      .eq("bloqueador_id", blockerId)
      .eq("bloqueado_id", blockedId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  },

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new Error("No puedes bloquear tu propia cuenta");
    }

    const { error } = await supabase.from("bloqueos_usuarios").upsert(
      {
        bloqueador_id: blockerId,
        bloqueado_id: blockedId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "bloqueador_id,bloqueado_id" },
    );

    if (error) throw error;

    invalidateBlockedUsersCache(blockerId);
  },

  async unblockUser(blockerId: string, blockedId: string) {
    const { error } = await supabase
      .from("bloqueos_usuarios")
      .delete()
      .eq("bloqueador_id", blockerId)
      .eq("bloqueado_id", blockedId);

    if (error) throw error;

    invalidateBlockedUsersCache(blockerId);
  },
};