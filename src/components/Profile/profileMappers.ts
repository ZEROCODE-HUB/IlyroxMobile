import { FeedItem, Post, Reel, User, perfiles } from "@/types";
import { normalizePostType } from "@/utils/stringNormalizer";

export const mapProfileToUser = (p: perfiles): User => {
  const name = [p.nombre, p.apellido_paterno, p.apellido_materno]
    .filter(Boolean)
    .join(" ");

  return {
    id: p.id,
    nombre: p.nombre,
    name: p.nombre_completo || name || "Usuario",
    avatar: p.foto,
    role: (p.rol.charAt(0).toUpperCase() + p.rol.slice(1)) as any,
    rating: parseFloat(p.calificacion_promedio || "0"),
    totalRatings: parseInt(p.total_calificaciones || "0"),
    positiveRecommendations: parseInt(p.total_recomendaciones_positivas || "0"),
    negativeRecommendations: parseInt(p.total_recomendaciones_negativas || "0"),
    isFollowing: false,
  };
};

const buildDefaultUser = (targetUserId?: string): User => ({
  id: targetUserId || "",
  name: "Usuario",
  avatar: "",
  role: "Cliente",
  isFollowing: false,
});


export const mapPostToFeedItem = (
  post: any,
  profile: perfiles | null,
  targetUserId?: string,
): FeedItem => ({
  id: post.feed_item_id || post.id,
  type: "post",
  user: profile ? mapProfileToUser(profile) : buildDefaultUser(targetUserId),
  content: post.contenido || "",
  postType: normalizePostType(post.tipo) as FeedItem["postType"],
  images: post.imagenes || [],
  likes: post.likes_count || 0,
  comments: post.comentarios_count || 0,
  timestamp: post.created_at,
  foto_perfil_usuario: post.foto_perfil,
  fecha_hora: post.fecha_hora,
  nombre_asesor: post.nombre_asesor,
  ubicacion: post.ubicacion,
  foto_propiedad: post.foto_propiedad,
  antiguedad: post.antiguedad,
  postDetails: post as Post,
  busquedas_json: post.busquedas_json,
});

export const mapReelToFeedItem = (
  reel: any,
  profile: perfiles | null,
  targetUserId?: string,
): FeedItem => ({
  id: reel.feed_item_id || reel.id,
  type: "reel",
  user: profile ? mapProfileToUser(profile) : buildDefaultUser(targetUserId),
  content: reel.descripcion || "",
  videoUrl: reel.video_url,
  images: reel.thumbnail_url ? [reel.thumbnail_url] : [],
  likes: reel.likes_count || 0,
  comments: reel.comentarios_count || 0,
  timestamp: reel.created_at,
  reelDetails: reel as Reel,
});
