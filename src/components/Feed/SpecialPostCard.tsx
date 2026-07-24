import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { FeedItem } from "../../types";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, CircularImageWithRays } from "../shared/Avatar";
import { COLORS } from "../../constants";
import { normalizePostType } from "../../utils/stringNormalizer";
import { useChatInitiator } from "@/hooks/messaging/useChatInitiator";
import firstUpperCase from "@/utils/firstUpperCase";
import { formatPrice } from "@/utils/priceFormatter";

interface SpecialPostCardProps {
  item: FeedItem;
  mode?: "preview" | "detail" | "grid" | "compact";
  /** Id del usuario en sesión. Se usa para mostrar datos privados (cliente/lead) solo al creador. */
  currentUserId?: string;
}

const SPECIAL_COLORS = {
  aniversario: COLORS.eventAnniversary,
  openhouse: COLORS.openHouse,
  sold: COLORS.sold,
  textWhite: COLORS.white,
};

export const SpecialPostCard: React.FC<SpecialPostCardProps> = ({
  item,
  mode = "preview",
  currentUserId,
}) => {
  const {
    postType: rawPostType,
    user,
    images,
    propertyDetails,
  } = item;
  // Dueño del post: solo a él se le muestran los datos privados del cliente/lead.
  const isOwner = !!(currentUserId && currentUserId === user.id);
  const postType = normalizePostType(rawPostType);
  const { handleContact } = useChatInitiator();

  const handleOfferProperty = () => {
    if (!item.user?.id) return;
    handleContact(item.user.id, null, {
      id: item.user.id,
      nombre: item.user.name?.split(" ")[0] || item.user.name || "",
      apellido_paterno: item.user.name?.split(" ")[1] || "",
      foto: item.user.avatar || null,
    });
  };

  // Datos variables
  const userName = item.nombre_asesor || user.nombre || user.name || "Usuario";
  const userLocation =
    item.ubicacion ||
    propertyDetails?.location?.address ||
    "Ubicación pendiente";
  const eventDate = item.fecha_hora || "Próximamente";
  // Asumimos antiguedad viene en el item aunque no esté en el tipo estricto aún, o usamos 1 por defecto
  const years = item.antiguedad || 1;
  const userAvatar =
    item.foto_perfil_usuario ||
    item.postDetails?.foto_perfil_usuario ||
    item.user?.avatar;
  const headerImage = item.foto_propiedad || images?.[0] || propertyDetails?.images?.[0];

  // --- RENDER: COMPACT MODE (para grids de 2 columnas) ---
  if (mode === "compact") {
    // COMPACT: OPEN HOUSE / SOLD
    if (postType === "openhouse" || postType === "sold") {
      const isSold =
        postType === "sold" ||
        item.status?.toLowerCase() === "vendida" ||
        item.status?.toLowerCase() === "sold";
      const mainColor = isSold ? SPECIAL_COLORS.sold : SPECIAL_COLORS.openhouse;
      const bannerText = isSold ? "VENDIDO" : "OPEN\nHOUSE";
      const formattedDate =
        eventDate !== "Próximamente"
          ? new Date(eventDate).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
          : null;

      return (
        <View style={styles.compactContainer}>
          {headerImage ? (
            <Image source={{ uri: headerImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: mainColor, opacity: headerImage ? 0.72 : 1 }]} />
          {userAvatar && (
            <View style={styles.compactAvatar}>
              <Avatar uri={userAvatar} name={userName} size={34} />
            </View>
          )}
          <Text style={styles.compactBannerText}>{bannerText}</Text>
          {!isSold && formattedDate && (
            <Text style={styles.compactSubText} numberOfLines={1}>{formattedDate}</Text>
          )}
          <View style={styles.compactLocationRow}>
            <Ionicons name="location-sharp" size={10} color="rgba(255,255,255,0.9)" />
            <Text style={styles.compactLocationText} numberOfLines={2}>{userLocation}</Text>
          </View>
        </View>
      );
    }

    // COMPACT: BUSQUEDA
    if (postType === "busqueda" && item.postDetails?.busquedas_json) {
      const { busquedas_json } = item.postDetails;
      return (
        <View style={[styles.compactContainer, { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.cardBorder }]}>
          <View style={styles.compactSearchHeader}>
            <Ionicons name={busquedas_json.icon || "search-outline"} size={18} color={COLORS.primary} />
            <Text style={styles.compactSearchTitle}>SE BUSCA</Text>
          </View>
          <Text style={styles.compactSearchType} numberOfLines={1}>
            {busquedas_json.filtros?.tipo_propiedad
              ? busquedas_json.filtros.tipo_propiedad.charAt(0).toUpperCase() + busquedas_json.filtros.tipo_propiedad.slice(1)
              : "Propiedad"}
          </Text>
          <View style={styles.compactBadge}>
            <Text style={styles.compactBadgeText}>{busquedas_json.filtros?.operacion || "Compra"}</Text>
          </View>
          {(busquedas_json.filtros?.ubicacion?.ciudad || busquedas_json.filtros?.ubicacion?.colonia) && (
            <View style={styles.compactLocationRow}>
              <Ionicons name="location-outline" size={10} color={COLORS.textTertiary} />
              <Text style={[styles.compactLocationText, { color: COLORS.textSecondary }]} numberOfLines={2}>
                {[busquedas_json.filtros.ubicacion.ciudad, busquedas_json.filtros.ubicacion.colonia]
                  .filter(Boolean).join(", ")}
              </Text>
            </View>
          )}
        </View>
      );
    }

    // COMPACT: ANIVERSARIO
    if (postType === "aniversario") {
      return (
        <View style={[styles.compactContainer, { backgroundColor: SPECIAL_COLORS.aniversario, justifyContent: "center" }]}>
          <View style={styles.compactBurstCircle}>
            <Avatar uri={userAvatar} name={userName} size={44} />
          </View>
          <Text style={styles.compactAniYears}>{years > 1 ? `${years} Años` : `${years} Año`}</Text>
          <Text style={styles.compactAniLabel}>Aniversario</Text>
          <Text style={styles.compactAniName} numberOfLines={1}>{userName}</Text>
        </View>
      );
    }

    return null;
  }

  // --- RENDER: GRID MODE (Prioridad Alta) ---
  if (mode === "grid") {
    // --- GRID: ANIVERSARIO ---
    if (postType === "aniversario") {
      return (
        <View
          style={[
            styles.gridContainer,
            { backgroundColor: SPECIAL_COLORS.aniversario },
          ]}
        >
          {/* Versión miniatura del avatar con burst */}
          <View style={styles.gridBurstCircle}>
            <Avatar
              uri={userAvatar}
              name={userName}
              size={40}
              style={styles.gridAvatar}
            />
          </View>
          <Text style={styles.gridTinyText}>Aniversario</Text>
          <Text style={styles.gridLargeText}>
            {years > 1 ? `${years} Años` : `${years} Año`}
          </Text>
        </View>
      );
    }

    // --- GRID: OPEN HOUSE / SOLD ---
    if (postType === "openhouse" || postType === "sold") {
      const isSold =
        postType === "sold" ||
        item.status?.toLowerCase() === "vendida" ||
        item.status?.toLowerCase() === "sold";
      const mainColor = isSold ? SPECIAL_COLORS.sold : SPECIAL_COLORS.openhouse;
      // Usamos salto de línea para que quepa mejor en un cuadro pequeño
      const centerText = isSold ? "VENDIDO" : "OPEN\nHOUSE";

      return (
        <View
          style={[
            styles.gridContainer,
            { backgroundColor: mainColor, justifyContent: "center" },
          ]}
        >
          {/* Solo texto grande centrado sobre el color característico */}
          <Text style={styles.gridBannerText}>{centerText}</Text>
          {!isSold && (
            // Opcional: Una fecha muy pequeña para Open House
            <Text style={styles.gridTinyDate} numberOfLines={1}>
              {eventDate !== "Próximamente"
                ? new Date(eventDate).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                  })
                : "Próx."}
            </Text>
          )}
        </View>
      );
    }

    // --- GRID: BUSQUEDA ---
    if (
      postType === "busqueda" &&
      item.postDetails?.busquedas_json &&
      mode === "grid"
    ) {
      const { busquedas_json } = item.postDetails;
      return (
        <View
          style={[
            styles.gridContainer,
            { backgroundColor: COLORS.primaryLight + "30" },
          ]}
        >
          <View style={styles.gridSearchIcon}>
            <Ionicons
              name={busquedas_json.icon || "search-outline"}
              size={24}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.gridSearchTitle}>SE BUSCA</Text>
          <Text style={styles.gridSearchType} numberOfLines={1}>
            {busquedas_json.filtros?.tipo_propiedad?.charAt(0).toUpperCase() +
              busquedas_json.filtros?.tipo_propiedad?.slice(1) || "Propiedad"}
          </Text>
          <View style={styles.gridSearchBadge}>
            <Text style={styles.gridSearchBadgeText}>
              {busquedas_json.filtros?.operacion || "Compra"}
            </Text>
          </View>
        </View>
      );
    }
    return null; // Si no es un tipo especial, no debería llegar aquí en grid
  }

  // --- RENDER: ANIVERSARIO (Full Card) ---
  if (postType === "aniversario") {
    return (
      <View
        style={[
          styles.cardContainer,
          styles.aniversaryContainer,
          { backgroundColor: SPECIAL_COLORS.aniversario },
        ]}
      >
        {/* Decoración superior */}
        <View style={styles.aniversaryHeader}>
          <Text style={styles.aniversaryTitle}>
            🎉 ¡Hoy celebro {years} años en el mundo inmobiliario! 🎉
          </Text>
        </View>

        {/* Avatar Central con efecto 'burst' */}
        <View style={styles.aniversaryAvatarContainer}>
          <View>
            <CircularImageWithRays uri={userAvatar} name={userName} />
          </View>
        </View>

        {/* Info Inferior */}
        <View style={styles.aniversaryFooter}>
          <Text style={styles.roleText}>Asesor Inmobiliario</Text>
          <Text style={styles.nameTextLarge}>{userName}</Text>
          <Text style={styles.locationText}>{userLocation}</Text>
        </View>
      </View>
    );
  }

  // --- RENDER: OPEN HOUSE y SOLD ---
  if (postType === "openhouse" || postType === "sold") {
    // Check item.status for 'sold' or fallback to postType
    const isSold =
      postType === "sold" ||
      item.status?.toLowerCase() === "vendida" ||
      item.status?.toLowerCase() === "sold";

    const mainColor = isSold ? SPECIAL_COLORS.sold : SPECIAL_COLORS.openhouse;
    const bannerText = isSold ? "VENDIDO" : "OPEN HOUSE";
    // Usamos item.foto_propiedad, o la primera imagen del post/propiedad
    const headerImage =
      item.foto_propiedad || images?.[0] || propertyDetails?.images?.[0];

    return (
      <View style={styles.cardContainer}>
        {/* Imagen Principal */}
        <View style={styles.openHouseImageContainer}>
          {headerImage ? (
            <Image
              source={{ uri: headerImage }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.coverImage, { backgroundColor: "#ccc" }]} />
          )}
        </View>

        {/* Banner Central */}
        <View style={[styles.bannerStrip, { backgroundColor: mainColor }]}>
          {/* Spacer para que el texto no quede detrás del avatar superpuesto */}
          {!isSold && <View style={styles.bannerAvatarSpace} />}
          <Text
            style={[
              styles.bannerText,
              isSold ? styles.soldText : styles.openHouseText,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {bannerText}
          </Text>
        </View>

        {/* Footer Info */}
        <View style={[styles.openHouseFooter, { backgroundColor: mainColor }]}>
          {/* Avatar sobrepuesto (Left) */}
          <View style={styles.overlappingAvatarContainer}>
            <Avatar
              uri={userAvatar}
              name={userName}
              size={110}
              style={styles.overlapAvatar}
            />
          </View>

          {/* Textos (Right) */}
          <View style={styles.openHouseInfo}>
            <Text style={styles.joinUsText}>
              {isSold ? "¡PROPIEDAD VENDIDA!" : "----- UNETENOS -----"}
            </Text>

            {!isSold && (
              <View>
                <Text style={styles.dateTimeText}>
                  Inicia:{" "}
                  {new Date(eventDate).toLocaleString("es-ES", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                {item.postDetails?.fecha_finalizacion && (
                  <Text style={[styles.dateTimeText]}>
                    Finaliza:{" "}
                    {new Date(
                      item.postDetails.fecha_finalizacion,
                    ).toLocaleString("es-ES", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.addressRow}>
              <Ionicons name="location-sharp" size={12} color="white" />
              <Text style={styles.addressText} numberOfLines={2}>
                {userLocation}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // --- RENDER: BUSQUEDA ---
  if (postType === "busqueda" && item.postDetails?.busquedas_json) {
    const { busquedas_json } = item.postDetails;
    const isDetail = mode === "detail";
    const f = busquedas_json.filtros ?? {};

    // Datos del cliente/lead asociado: privados, solo visibles para el creador
    // del post y únicamente en el detalle (nunca en el feed ni a otros usuarios).
    const prospecto = busquedas_json.prospecto;
    const showCliente = isDetail && isOwner && !!prospecto?.nombre;

    // Operación (venta/renta). Soporta múltiple (operaciones[]) y legacy (operacion string)
    const operaciones: string[] = (
      Array.isArray(f.operaciones) && f.operaciones.length > 0
        ? f.operaciones
        : typeof f.operacion === "string" && f.operacion
          ? [f.operacion]
          : []
    )
      .map((o: any) => String(o).toLowerCase())
      .filter((o: string) => o === "venta" || o === "renta");

    // Título grande: tipo de propiedad (o primer subtipo si no hay tipo).
    // Soporta el schema legacy donde `subtipo` venía como string suelto.
    const subtipoArr: string[] = Array.isArray(f.subtipo)
      ? f.subtipo.filter(
          (s: unknown) => typeof s === "string" && (s as string).trim().length > 0,
        )
      : typeof f.subtipo === "string" && f.subtipo.trim()
        ? [f.subtipo]
        : [];
    const rawTipo = f.tipo_propiedad || subtipoArr[0] || "Propiedad";
    const titulo = firstUpperCase(rawTipo);

    // Rango(s) de presupuesto: compra y/o renta
    const moneda = f.moneda || "MXN";
    const precioNum = (v: unknown): number | null =>
      typeof v === "number" && v > 0 ? v : null;
    const fmtRango = (min: number | null, max: number | null): string | null => {
      if (min && max) return `${formatPrice(min)} – ${formatPrice(max)} ${moneda}`;
      if (min) return `Desde ${formatPrice(min)} ${moneda}`;
      if (max) return `Hasta ${formatPrice(max)} ${moneda}`;
      return null;
    };
    const ventaRango = fmtRango(precioNum(f.precio_min), precioNum(f.precio_max));
    const rentaRango = fmtRango(precioNum(f.precio_renta_min), precioNum(f.precio_renta_max));
    const hayAmbosPrecios = !!ventaRango && !!rentaRango;
    const presupuestos: Array<{ label: string; text: string }> = [];
    if (ventaRango)
      presupuestos.push({ label: hayAmbosPrecios ? "PRESUPUESTO · COMPRA" : "PRESUPUESTO", text: ventaRango });
    if (rentaRango)
      presupuestos.push({ label: hayAmbosPrecios ? "PRESUPUESTO · RENTA" : "PRESUPUESTO", text: rentaRango });
    if (presupuestos.length === 0)
      presupuestos.push({ label: "PRESUPUESTO", text: "Sin especificar" });

    // Zonas (chips de locationChips)
    const zonas: Array<{ id?: string; label: string }> = Array.isArray(f.zonas_interes)
      ? f.zonas_interes
      : [];

    // Ubicaciones multi-nivel (nuevo schema): un chip por entrada con su label
    const ubicacionesMulti: string[] = Array.isArray(f.ubicaciones)
      ? f.ubicaciones
          .filter((u: any) => u && typeof u.label === "string" && u.label.trim())
          .map((u: any) => u.label as string)
      : [];

    // Colonias múltiples (schema anterior) o legacy (string)
    const coloniasArr: string[] = Array.isArray(f.ubicacion?.colonias)
      ? f.ubicacion.colonias.filter(
          (c: unknown) => typeof c === "string" && (c as string).trim().length > 0,
        )
      : typeof f.ubicacion?.colonia === "string" && f.ubicacion.colonia.trim()
        ? [f.ubicacion.colonia]
        : [];

    // Fallback: priorizar las ubicaciones multi-nivel; si no hay, usar los datos legacy
    const ubicacionFallback = !zonas.length
      ? ubicacionesMulti.length > 0
        ? ubicacionesMulti
        : coloniasArr.length > 0
          ? [coloniasArr.join(", ")]
          : [f.ubicacion?.ciudad, f.ubicacion?.municipio, f.ubicacion?.estado]
              .filter((s) => typeof s === "string" && s.trim().length > 0)
              .slice(0, 1)
      : [];

    // Características y superficies: mostramos todo lo que el usuario llenó
    const num = (v: unknown): number | null =>
      typeof v === "number" && v > 0 ? v : null;
    const fmt = (n: number): string =>
      String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    const habitaciones = num(f.caracteristicas?.habitaciones);
    const banos = num(f.caracteristicas?.banos);
    const mediosBanos = num(f.caracteristicas?.medios_banos);
    const estacionamientos = num(f.caracteristicas?.estacionamientos);
    const niveles = num(f.caracteristicas?.niveles);
    const antiguedad: string =
      typeof f.caracteristicas?.antiguedad === "string"
        ? f.caracteristicas.antiguedad.trim()
        : "";

    // Superficies mínimas → el post indica que se busca "más de" (+) esa cantidad
    const m2TerrenoMin = num(f.superficies?.m2_terreno_min);
    const m2ConstruccionMin = num(f.superficies?.m2_construccion_min);

    const stats: Array<{ key: string; emoji: string; value: string; label: string }> = [];
    if (habitaciones) stats.push({ key: "rec", emoji: "🛏️", value: String(habitaciones), label: "rec." });
    if (banos) stats.push({ key: "ban", emoji: "🚽", value: String(banos), label: "baños" });
    if (mediosBanos) stats.push({ key: "medban", emoji: "🚽", value: String(mediosBanos), label: "½ baños" });
    if (estacionamientos) stats.push({ key: "est", emoji: "🚗", value: String(estacionamientos), label: "estac." });
    if (niveles) stats.push({ key: "niv", emoji: "🏢", value: String(niveles), label: niveles === 1 ? "planta" : "plantas" });

    const nota: string = typeof f.nota === "string" ? f.nota : "";

    // Detalles especializados según tipo (comercial / industrial / agrícola)
    const joinArr = (v: unknown): string =>
      Array.isArray(v)
        ? v.filter(Boolean).join(", ")
        : typeof v === "string"
          ? v
          : "";
    const especializados: Array<{ key: string; value: string }> = [];
    const detAdd = (key: string, value: string) => {
      if (value && value.trim()) especializados.push({ key, value });
    };
    if (f.comercial) {
      const c = f.comercial;
      detAdd("Ubicación", joinArr(c.tipoUbicacion));
      if (c.frenteMin) detAdd("Frente mín.", `${c.frenteMin} m`);
      if (c.nivel) detAdd("Nivel", String(c.nivel));
      const flags: string[] = [];
      if (c.sobreAvenidaPrincipal) flags.push("Av. principal");
      if (c.enEsquina) flags.push("En esquina");
      if (c.altaVisibilidad) flags.push("Alta visibilidad");
      if (c.altoFlujoVehicular) flags.push("Alto flujo");
      detAdd("Características", flags.join(", "));
    }
    if (f.industrial) {
      const it = f.industrial;
      detAdd("Ubicación", joinArr(it.ubicacion));
      detAdd("Altura libre", joinArr(it.alturaLibre));
      detAdd("Energía", joinArr(it.energiaKva));
      if (it.areaOficinasMin) detAdd("Oficinas mín.", `${it.areaOficinasMin} m²`);
      if (it.patioManiobrasMin) detAdd("Patio maniobras mín.", `${it.patioManiobrasMin} m²`);
    }
    if (f.agricola) {
      const a = f.agricola;
      detAdd("Agua", joinArr(a.tiposAgua));
      if (a.concesionAgua) detAdd("Concesión de agua", "Sí");
      detAdd("Uso de terreno", joinArr(a.usoTerreno));
      detAdd("Tipo de riego", joinArr(a.tipoRiego));
      const serv: string[] = [];
      if (a.electricidad) serv.push("Electricidad");
      if (a.caminoAcceso) serv.push("Camino de acceso");
      if (a.cercado) serv.push("Cercado");
      if (a.pieCarretera) serv.push("Pie de carretera");
      if (a.accesCamiones) serv.push("Acceso camiones");
      detAdd("Servicios", serv.join(", "));
    }

    return (
      <View style={[styles.cardContainer, isDetail && styles.detailContainer]}>
        <View
          style={[
            styles.searchPostContainer,
            isDetail && styles.searchPostDetail,
          ]}
        >
          {/* Chip SE BUSCA + Operación */}
          <View style={styles.busquedaTagRow}>
            <Ionicons name="search-outline" size={14} color={COLORS.primary} />
            <Text style={styles.busquedaTagText}>SE BUSCA</Text>
            {operaciones.map((op) => (
              <View key={op} style={styles.operacionChip}>
                <Text style={styles.operacionChipText}>
                  {op === "venta" ? "EN VENTA" : "EN RENTA"}
                </Text>
              </View>
            ))}
          </View>

          {/* Cliente/lead asociado — privado, solo el creador lo ve en el detalle */}
          {showCliente && (
            <View style={styles.clienteCard}>
              <View style={styles.clienteHeaderRow}>
                <Ionicons
                  name="lock-closed"
                  size={12}
                  color={COLORS.primary}
                />
                <Text style={styles.clienteHeaderText}>
                  CLIENTE · Solo visible para ti
                </Text>
              </View>
              <Text style={styles.clienteNombre}>{prospecto.nombre}</Text>
              {prospecto.telefono ? (
                <View style={styles.clienteContactoRow}>
                  <Ionicons
                    name="call-outline"
                    size={13}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.clienteContactoText}>
                    {prospecto.telefono}
                  </Text>
                </View>
              ) : null}
              {prospecto.email ? (
                <View style={styles.clienteContactoRow}>
                  <Ionicons
                    name="mail-outline"
                    size={13}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.clienteContactoText}>
                    {prospecto.email}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Título grande */}
          <Text style={styles.busquedaTitulo} numberOfLines={2}>
            {titulo}
          </Text>

          {/* Subtipos seleccionados (todos) */}
          {subtipoArr.length > 0 && (
            <View style={styles.busquedaSubtipoRow}>
              {subtipoArr.map((s, idx) => (
                <View key={`${s}-${idx}`} style={styles.busquedaSubtipoChip}>
                  <Text style={styles.busquedaSubtipoText}>{firstUpperCase(s)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Presupuesto(s): compra y/o renta */}
          {presupuestos.map((p, i) => (
            <React.Fragment key={i}>
              <Text style={styles.busquedaLabel}>{p.label}</Text>
              <Text style={styles.busquedaPresupuesto}>{p.text}</Text>
            </React.Fragment>
          ))}

          {/* Zonas de interés */}
          {(zonas.length > 0 || ubicacionFallback.length > 0) && (
            <>
              <Text style={styles.busquedaLabel}>ZONAS DE INTERÉS</Text>
              <View style={styles.busquedaZonasRow}>
                {zonas.map((z, idx) => (
                  <View key={z.id ?? `${z.label}-${idx}`} style={styles.busquedaZonaChip}>
                    <Text style={styles.busquedaZonaPin}>📍</Text>
                    <Text style={styles.busquedaZonaText} numberOfLines={1}>
                      {z.label}
                    </Text>
                  </View>
                ))}
                {ubicacionFallback.map((label, idx) => (
                  <View key={`fallback-${idx}`} style={styles.busquedaZonaChip}>
                    <Text style={styles.busquedaZonaPin}>📍</Text>
                    <Text style={styles.busquedaZonaText} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Características */}
          {stats.length > 0 && (
            <>
              <Text style={styles.busquedaLabel}>CARACTERÍSTICAS</Text>
              <View style={styles.busquedaStatsRow}>
                {stats.map((s) => (
                  <Text key={s.key} style={styles.busquedaStat}>
                    {s.emoji}{" "}
                    <Text style={styles.busquedaStatValue}>{s.value}</Text> {s.label}
                  </Text>
                ))}
              </View>
            </>
          )}

          {/* Superficie mínima → se busca "más de" (+) esa cantidad */}
          {(m2TerrenoMin || m2ConstruccionMin) && (
            <>
              <Text style={styles.busquedaLabel}>SUPERFICIE</Text>
              <View style={styles.busquedaStatsRow}>
                {m2TerrenoMin ? (
                  <Text style={styles.busquedaStat}>
                    📐{" "}
                    <Text style={styles.busquedaStatValue}>
                      +{fmt(m2TerrenoMin)} m²
                    </Text>{" "}
                    terreno
                  </Text>
                ) : null}
                {m2ConstruccionMin ? (
                  <Text style={styles.busquedaStat}>
                    🏗️{" "}
                    <Text style={styles.busquedaStatValue}>
                      +{fmt(m2ConstruccionMin)} m²
                    </Text>{" "}
                    construcción
                  </Text>
                ) : null}
              </View>
            </>
          )}

          {/* Antigüedad */}
          {antiguedad.length > 0 && (
            <>
              <Text style={styles.busquedaLabel}>ANTIGÜEDAD</Text>
              <Text style={styles.busquedaAntiguedad}>{antiguedad}</Text>
            </>
          )}

          {/* Detalles especializados (comercial / industrial / agrícola) */}
          {especializados.length > 0 && (
            <>
              <Text style={styles.busquedaLabel}>DETALLES</Text>
              <View style={styles.busquedaDetalles}>
                {especializados.map((d, i) => (
                  <View key={`${d.key}-${i}`} style={styles.busquedaDetalleRow}>
                    <Text style={styles.busquedaDetalleKey}>{d.key}</Text>
                    <Text style={styles.busquedaDetalleValue}>{d.value}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Nota */}
          {nota.trim().length > 0 && (
            <>
              <View style={styles.busquedaSeparator} />
              <Text style={styles.busquedaNota}>
                <Text style={styles.busquedaNotaLabel}>Nota: </Text>
                {nota}
              </Text>
            </>
          )}
        </View>

        {/* Botón Ofrecer propiedad */}
        <TouchableOpacity
          style={[styles.busquedaCta, isDetail && styles.busquedaCtaDetail]}
          onPress={handleOfferProperty}
          activeOpacity={0.85}
        >
          <Text style={styles.busquedaCtaText}>Ofrecer propiedad 👋</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  cardContainer: {
    width: "100%",
    overflow: "hidden",
    // Reducido para evitar el espacio inferior excesivo
    minHeight: 200,
  },
  detailContainer: {
    minHeight: 200,
  },

  // --- ESTILOS ANIVERSARIO ---
  aniversaryContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
  },
  aniversaryHeader: {
    padding: 10,
    alignItems: "center",
  },
  aniversaryEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  aniversaryTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#6A1B9A",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  aniversaryAvatarContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  burstCircle: {
    padding: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 100,
    borderWidth: 2,
    borderColor: COLORS.white,
    borderStyle: "dashed", // Simula los rayos del diseño
  },
  largeAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  aniversaryFooter: {
    padding: 20,
    alignItems: "center",
  },
  roleText: {
    color: "#6A1B9A", // Azul más oscuro
    fontWeight: "bold",
    fontSize: 14,
    textTransform: "uppercase",
  },
  nameTextLarge: {
    color: "#6A1B9A",
    fontWeight: "900",
    fontSize: 22,
    marginVertical: 4,
  },
  locationText: {
    color: "#6A1B9A",
    fontSize: 14,
  },

  // --- ESTILOS OPEN HOUSE / SOLD ---
  openHouseImageContainer: {
    width: "100%",
    height: 220, // Altura fija para la imagen superior
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  bannerStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingRight: 16,
    zIndex: 2,
    marginTop: -10,
  },
  // Espacio en blanco que ocupa la zona donde el avatar se superpone
  // (paddingLeft footer:20 + avatar+border:118 + marginRight:15 ≈ 153)
  bannerAvatarSpace: {
    width: 148,
    flexShrink: 0,
  },
  bannerText: {
    color: "#ffffffff",
    fontWeight: "900",
    fontSize: 22,
    textTransform: "uppercase",
    letterSpacing: 2,
    textAlign: "center",
    flex: 1,
  },
  openHouseFooter: {
    flexDirection: "row",
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    minHeight: 120,
  },
  overlappingAvatarContainer: {
    marginTop: -50, // Truco para que suba hacia el banner/imagen
    marginRight: 15,
    zIndex: 10,
  },
  overlapAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: COLORS.white, // Borde blanco como en la imagen
  },
  openHouseInfo: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 5,
  },
  joinUsText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 5,
    textAlign: "center",
  },
  dateTimeText: {
    color: "#ffffffff", // Azul claro para contrastar con morado
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 5,
    textAlign: "center",
  },
  addressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  addressText: {
    color: "#ffffffff",
    fontSize: 12,
    textAlign: "center",
    flexShrink: 1,
  },
  soldText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 28,
    textTransform: "uppercase",
    letterSpacing: 2,
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#D32F2F",
    borderColor: COLORS.white,
    borderWidth: 2,
  },
  openHouseText: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 22,
    textTransform: "uppercase",
    letterSpacing: 3,
    flex: 1,
    textAlign: "center",
  },

  // ================= ESTILOS GRID =================
  gridContainer: {
    width: "100%",
    // Esto fuerza a que sea un cuadrado perfecto, ideal para grids
    aspectRatio: 1,
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    overflow: "hidden",
    // No usamos minHeight aquí para que se adapte a la celda del grid
  },
  // Grid Aniversario
  gridBurstCircle: {
    padding: 3,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: COLORS.white,
    borderStyle: "dashed",
    marginBottom: 4,
    marginTop: 8,
  },
  gridAvatar: {
    width: 40, // Avatar mucho más pequeño
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  gridTinyText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  gridLargeText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "900",
  },
  // Grid OpenHouse/Sold
  gridBannerText: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 18, // Tamaño suficiente para leer en pequeño
    textTransform: "uppercase",
    textAlign: "center",
    lineHeight: 20, // Ajustado para cuando hay salto de línea (OPEN\nHOUSE)
  },
  gridTinyDate: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    marginTop: 4,
    fontWeight: "bold",
  },
  // Grid Busqueda
  gridSearchIcon: {
    marginTop: 10,
    marginBottom: 5,
  },
  gridSearchTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.primaryDark,
    opacity: 0.8,
  },
  gridSearchType: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginVertical: 4,
  },
  gridSearchBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: "auto",
    marginBottom: 10,
  },
  gridSearchBadgeText: {
    fontSize: 8,
    color: COLORS.white,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  // --- ESTILOS BUSQUEDA ---
  searchPostContainer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchPostDetail: {
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    borderWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
    padding: 24,
  },
  busquedaTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  busquedaTagText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 1.2,
  },
  clienteCard: {
    backgroundColor: COLORS.primaryTransparent,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 4,
  },
  clienteHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  clienteHeaderText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.6,
  },
  clienteNombre: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  clienteContactoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  clienteContactoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  operacionChip: {
    marginLeft: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  operacionChipText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 0.8,
  },
  busquedaTitulo: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 16,
    lineHeight: 28,
  },
  busquedaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  busquedaPresupuesto: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  busquedaZonasRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  busquedaZonaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    maxWidth: "100%",
  },
  busquedaZonaPin: {
    fontSize: 13,
  },
  busquedaZonaText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
    maxWidth: 180,
  },
  busquedaSubtipoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: -8,
    marginBottom: 16,
  },
  busquedaSubtipoChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight + "30",
    borderWidth: 1,
    borderColor: COLORS.primary + "40",
  },
  busquedaSubtipoText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  busquedaStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    rowGap: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  busquedaAntiguedad: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  busquedaStat: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  busquedaStatValue: {
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  busquedaSeparator: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 14,
  },
  busquedaDetalles: {
    gap: 6,
    marginBottom: 16,
  },
  busquedaDetalleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  busquedaDetalleKey: {
    fontSize: 13,
    color: COLORS.textTertiary,
    flexShrink: 0,
  },
  busquedaDetalleValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  busquedaNota: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  busquedaNotaLabel: {
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  busquedaCta: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  busquedaCtaDetail: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  busquedaCtaText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },

  // ================= ESTILOS COMPACT (2 columnas) =================
  compactContainer: {
    width: "100%",
    aspectRatio: 3 / 4,
    overflow: "hidden",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 10,
    gap: 3,
  },
  compactAvatar: {
    position: "absolute",
    top: 10,
    left: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.white,
    overflow: "hidden",
  },
  compactBannerText: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 16,
    textTransform: "uppercase",
    textAlign: "center",
    lineHeight: 18,
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  compactSubText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  compactLocationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 3,
    width: "100%",
  },
  compactLocationText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    flex: 1,
    lineHeight: 13,
  },
  // Compact busqueda
  compactSearchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
  },
  compactSearchTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
  },
  compactSearchType: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginTop: "auto" as any,
  },
  compactBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  compactBadgeText: {
    fontSize: 9,
    color: COLORS.white,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  // Compact aniversario
  compactBurstCircle: {
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: COLORS.white,
    borderStyle: "dashed",
    padding: 3,
    marginBottom: 6,
  },
  compactAniYears: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "900",
  },
  compactAniLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 1,
  },
  compactAniName: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
  },
});
