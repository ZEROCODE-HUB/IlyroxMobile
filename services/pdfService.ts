import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../lib/supabase";

// ============================================================================
// CONFIGURACION DE CAMPOS - Editar aquí qué información mostrar en el PDF
// ============================================================================

export const PDF_FIELD_CONFIG = {
  // Información básica de la propiedad
  showCodigo: true,
  showTipo: true,
  showSubtipo: true,
  showDescripcion: true,
  showStatus: true,

  // Ubicación
  showDireccionCompleta: true,
  showColonia: true,
  showCiudad: true,
  showMunicipio: true,
  showEstado: true,

  // Características físicas
  showMetrosConstruccion: true,
  showMetrosTerreno: true,
  showHabitaciones: true,
  showBanos: true,
  showEstacionamientos: true,
  showPisos: true,
  showAntiguedad: true,
  showAmueblado: true,
  showPetFriendly: true,

  // Descripciones de plantas
  showDescripcionPlantaBaja: true,
  showDescripcionPlantaAlta: true,

  // Características especiales
  showCaracteristicasEspecificas: true,
  showAmenidades: true,

  // Información financiera
  showPrecio: true,
  showMoneda: true,
  showTipoOperacion: true,
  showPeriodoRenta: true,
  showMontoEnganche: true,
  showFinanciamientos: true,

  // Comisiones (solo con datos)
  showComision: true,
  showComisionCompartida: true,

  // Gravámenes
  showGravamenes: true,

  // Datos del creador/agente
  showNombreCreador: true,
  showTelefonoCreador: true,
  showEmailCreador: true,
  showFotoCreador: true,
  showExperienciaCreador: true,
  showInmobiliariaCreador: true,
  showBiografiaCreador: true,

  // Imágenes
  showImagenes: true,
  showVideos: false, // Videos solo como links
};

// Configuración para "Sin Datos" - campos a ocultar cuando se elige esta opción
export const PDF_SIN_DATOS_OVERRIDE: Partial<typeof PDF_FIELD_CONFIG> = {
  showComision: false,
  showComisionCompartida: false,
  showGravamenes: false,
  showTelefonoCreador: false,
  showEmailCreador: false,
  showBiografiaCreador: false,
};

// ============================================================================
// TIPOS
// ============================================================================

export interface PropertyPdfData {
  // Datos básicos
  id: string;
  codigo_propiedad: string;
  tipo: string;
  subtipo: string | null;
  descripcion: string | null;
  status: string | null;

  // Ubicación
  calle: string | null;
  numero_exterior: string | null;
  numero_interior: string | null;
  colonia: string | null;
  ciudad: string | null;
  municipio: string | null;
  estado: string | null;

  // Características
  metros_cuadrados_construccion: number | null;
  metros_cuadrados_terreno: number | null;
  habitaciones: number;
  banos: number;
  estacionamientos: number;
  pisos: number | null;
  antiguedad: string | null;
  amueblado: string | null;
  pet_friendly: string;

  // Descripciones
  descripcion_planta_baja: string | null;
  descripcion_planta_alta: string | null;
  caracteristicas_especificas: string[] | null;

  // Financiero
  monto_enganche: number | null;

  // Media
  fotos: string[] | null;
  videos: string[] | null;

  // Relaciones
  operaciones: OperacionPropiedad[];
  amenidades: { amenidad: { nombre: string } }[];
  financiamientos: { tipo: { nombre: string } }[];
  gravamenes: {
    monto: number | null;
    notas: string | null;
    institucion: { nombre: string };
  }[];
  perfil: PerfilCreador | null;
}

interface OperacionPropiedad {
  tipo_operacion: string;
  precio: number;
  moneda: string;
  periodo_renta: string | null;
  comision_tipo: string | null;
  comision_porcentaje: number | null;
  comision_monto_fijo: number | null;
  comparte_comision: boolean;
  porcentaje_comision_compartida: number | null;
  condiciones_comision_compartida: string | null;
}

interface PerfilCreador {
  nombre: string | null;
  nombre_completo: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  celular: string | null;
  prefijo_celular: string | null;
  email: string | null;
  foto: string | null;
  anos_experiencia: string | null;
  nombre_inmobiliaria: string | null;
  biografia: string | null;
  ocupacion: string | null;
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Sanitiza texto para evitar errores con valores null/undefined
 * y escapa caracteres especiales HTML
 */
const safeText = (text: string | null | undefined): string => {
  if (text === null || text === undefined) return "";
  const str = String(text);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const formatPrice = (
  price: number | null | undefined,
  currency: string = "MXN",
): string => {
  if (price === null || price === undefined) return "";
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: currency || "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `$${price}`;
  }
};

const formatOperationType = (tipo: string | null | undefined): string => {
  if (!tipo) return "";
  const tipos: Record<string, string> = {
    venta: "Venta",
    renta: "Renta",
  };
  const tipoLower = String(tipo).toLowerCase();
  return tipos[tipoLower] || String(tipo);
};

const formatPeriod = (periodo: string | null | undefined): string => {
  if (!periodo) return "";
  const periodos: Record<string, string> = {
    mensual: "/mes",
    anual: "/año",
    semanal: "/semana",
    diario: "/día",
  };
  const periodoLower = String(periodo).toLowerCase();
  return periodos[periodoLower] || `/${periodo}`;
};

const buildAddress = (data: PropertyPdfData): string => {
  const parts: string[] = [];

  if (data.calle) {
    let street = data.calle;
    if (data.numero_exterior) street += ` #${data.numero_exterior}`;
    if (data.numero_interior) street += ` Int. ${data.numero_interior}`;
    parts.push(street);
  }

  return parts.join(", ");
};

const getCreatorFullName = (perfil: PerfilCreador | null): string => {
  if (!perfil) return "Agente";

  if (perfil.nombre_completo) return perfil.nombre_completo;

  const parts: string[] = [];
  if (perfil.nombre) parts.push(perfil.nombre);
  if (perfil.apellido_paterno) parts.push(perfil.apellido_paterno);
  if (perfil.apellido_materno) parts.push(perfil.apellido_materno);

  return parts.length > 0 ? parts.join(" ") : "Agente";
};

const getCreatorPhone = (perfil: PerfilCreador | null): string => {
  if (!perfil?.celular) return "";
  const prefix = perfil.prefijo_celular || "+52";
  return `${prefix} ${perfil.celular}`;
};

// ============================================================================
// OBTENER DATOS DE LA PROPIEDAD
// ============================================================================

export const fetchPropertyData = async (
  propertyId: string,
): Promise<PropertyPdfData | null> => {
  try {
    const { data, error } = await supabase
      .from("propiedades")
      .select(
        `
        *,
        operaciones:operaciones_propiedad(*),
        perfil:perfiles!propiedades_creado_por_fkey(*),
        amenidades:propiedad_amenidades(amenidad:catalogo_amenidades(nombre)),
        gravamenes:propiedad_gravamenes(*, institucion:catalogo_instituciones_financieras(nombre)),
        financiamientos:propiedad_financiamientos(tipo:catalogo_tipos_financiamiento(nombre))
      `,
      )
      .eq("id", propertyId)
      .single();

    if (error) {
      console.error("Error fetching property data:", error);
      return null;
    }

    return data as PropertyPdfData;
  } catch (err) {
    console.error("Error in fetchPropertyData:", err);
    return null;
  }
};

// ============================================================================
// GENERADOR DE HTML
// ============================================================================

const generatePropertyHtml = (
  data: PropertyPdfData,
  config: typeof PDF_FIELD_CONFIG,
): string => {
  const operacionPrincipal = data.operaciones?.[0];

  // Construir secciones del HTML
  // Limitar a 10 imágenes máximo para evitar errores de memoria
  const MAX_IMAGES = 10;
  let imagesHtml = "";
  if (config.showImagenes && data.fotos && data.fotos.length > 0) {
    const validPhotos = data.fotos
      .filter(
        (foto) => foto && typeof foto === "string" && foto.startsWith("http"),
      )
      .slice(0, MAX_IMAGES);

    imagesHtml = validPhotos
      .map(
        (foto, index) => `
      <div class="image-container">
        <img src="${foto}" alt="Imagen ${index + 1}" class="property-image" onerror="this.style.display='none'" />
      </div>
    `,
      )
      .join("");
  }

  // Información del creador
  let creatorHtml = "";
  if (data.perfil) {
    const creatorParts: string[] = [];

    if (config.showNombreCreador) {
      creatorParts.push(`
        <div class="creator-name">${safeText(getCreatorFullName(data.perfil))}</div>
      `);
    }

    if (config.showFotoCreador && data.perfil.foto) {
      creatorParts.unshift(`
        <img src="${safeText(data.perfil.foto)}" alt="Foto agente" class="creator-photo" />
      `);
    }

    if (config.showTelefonoCreador && data.perfil.celular) {
      creatorParts.push(`
        <div class="creator-detail">
          <span class="label">Tel:</span> ${safeText(getCreatorPhone(data.perfil))}
        </div>
      `);
    }

    if (config.showEmailCreador && data.perfil.email) {
      creatorParts.push(`
        <div class="creator-detail">
          <span class="label">Email:</span> ${safeText(data.perfil.email)}
        </div>
      `);
    }

    if (config.showExperienciaCreador && data.perfil.anos_experiencia) {
      creatorParts.push(`
        <div class="creator-detail">
          <span class="label">Experiencia:</span> ${safeText(data.perfil.anos_experiencia)}
        </div>
      `);
    }

    if (config.showInmobiliariaCreador && data.perfil.nombre_inmobiliaria) {
      creatorParts.push(`
        <div class="creator-detail">
          <span class="label">Inmobiliaria:</span> ${safeText(data.perfil.nombre_inmobiliaria)}
        </div>
      `);
    }

    if (config.showBiografiaCreador && data.perfil.biografia) {
      creatorParts.push(`
        <div class="creator-bio">${safeText(data.perfil.biografia)}</div>
      `);
    }

    if (creatorParts.length > 0) {
      creatorHtml = `
        <div class="section">
          <h2>Agente</h2>
          <div class="creator-card">
            ${creatorParts.join("")}
          </div>
        </div>
      `;
    }
  }

  // Amenidades
  let amenidadesHtml = "";
  if (config.showAmenidades && data.amenidades && data.amenidades.length > 0) {
    const amenidadesList = data.amenidades
      .map((a) => a.amenidad?.nombre)
      .filter(Boolean)
      .map((nombre) => `<span class="tag">${safeText(nombre)}</span>`)
      .join("");

    if (amenidadesList) {
      amenidadesHtml = `
        <div class="section">
          <h2>Amenidades</h2>
          <div class="tags-container">${amenidadesList}</div>
        </div>
      `;
    }
  }

  // Características específicas
  let caracteristicasHtml = "";
  if (
    config.showCaracteristicasEspecificas &&
    data.caracteristicas_especificas &&
    data.caracteristicas_especificas.length > 0
  ) {
    const caracteristicasList = data.caracteristicas_especificas
      .map((c) => `<span class="tag">${safeText(c)}</span>`)
      .join("");

    caracteristicasHtml = `
      <div class="section">
        <h2>Características Especiales</h2>
        <div class="tags-container">${caracteristicasList}</div>
      </div>
    `;
  }

  // Financiamientos
  let financiamientosHtml = "";
  if (
    config.showFinanciamientos &&
    data.financiamientos &&
    data.financiamientos.length > 0
  ) {
    const financiamientosList = data.financiamientos
      .map((f) => f.tipo?.nombre)
      .filter(Boolean)
      .map(
        (nombre) => `<span class="tag tag-finance">${safeText(nombre)}</span>`,
      )
      .join("");

    if (financiamientosList) {
      financiamientosHtml = `
        <div class="section">
          <h2>Acepta Financiamiento</h2>
          <div class="tags-container">${financiamientosList}</div>
        </div>
      `;
    }
  }

  // Gravámenes
  let gravamenesHtml = "";
  if (config.showGravamenes && data.gravamenes && data.gravamenes.length > 0) {
    const gravamenesList = data.gravamenes
      .map(
        (g) => `
        <div class="gravamen-item">
          <strong>${safeText(g.institucion?.nombre) || "Institución"}</strong>
          ${g.monto ? `<br>Monto: ${formatPrice(g.monto)}` : ""}
          ${g.notas ? `<br><small>${safeText(g.notas)}</small>` : ""}
        </div>
      `,
      )
      .join("");

    gravamenesHtml = `
      <div class="section">
        <h2>Gravámenes</h2>
        ${gravamenesList}
      </div>
    `;
  }

  // Comisión
  let comisionHtml = "";
  if (config.showComision && operacionPrincipal) {
    const comisionParts: string[] = [];

    if (operacionPrincipal.comision_porcentaje) {
      comisionParts.push(
        `<div class="detail-row"><span class="label">Comisión:</span> ${operacionPrincipal.comision_porcentaje}%</div>`,
      );
    }

    if (operacionPrincipal.comision_monto_fijo) {
      comisionParts.push(
        `<div class="detail-row"><span class="label">Comisión fija:</span> ${formatPrice(operacionPrincipal.comision_monto_fijo)}</div>`,
      );
    }

    if (config.showComisionCompartida && operacionPrincipal.comparte_comision) {
      comisionParts.push(
        `<div class="detail-row"><span class="label">Comparte comisión:</span> Sí (${operacionPrincipal.porcentaje_comision_compartida || 50}%)</div>`,
      );

      if (operacionPrincipal.condiciones_comision_compartida) {
        comisionParts.push(
          `<div class="detail-row"><span class="label">Condiciones:</span> ${safeText(operacionPrincipal.condiciones_comision_compartida)}</div>`,
        );
      }
    }

    if (comisionParts.length > 0) {
      comisionHtml = `
        <div class="section">
          <h2>Comisión</h2>
          ${comisionParts.join("")}
        </div>
      `;
    }
  }

  // Descripciones de plantas
  let plantasHtml = "";
  const plantasParts: string[] = [];

  if (config.showDescripcionPlantaBaja && data.descripcion_planta_baja) {
    plantasParts.push(`
      <div class="planta-desc">
        <h3>Planta Baja</h3>
        <p>${safeText(data.descripcion_planta_baja)}</p>
      </div>
    `);
  }

  if (config.showDescripcionPlantaAlta && data.descripcion_planta_alta) {
    plantasParts.push(`
      <div class="planta-desc">
        <h3>Planta Alta</h3>
        <p>${safeText(data.descripcion_planta_alta)}</p>
      </div>
    `);
  }

  if (plantasParts.length > 0) {
    plantasHtml = `
      <div class="section">
        <h2>Descripción por Plantas</h2>
        ${plantasParts.join("")}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #333;
          line-height: 1.5;
          background: #fff;
        }

        .header {
          background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%);
          color: white;
          padding: 24px;
          text-align: center;
        }

        .header h1 {
          font-size: 24px;
          margin-bottom: 8px;
        }

        .header .price {
          font-size: 28px;
          font-weight: bold;
        }

        .header .operation-type {
          font-size: 14px;
          opacity: 0.9;
          margin-top: 4px;
        }

        .header .code {
          font-size: 12px;
          opacity: 0.8;
          margin-top: 8px;
        }

        .images-grid {
          width: 100%;
        }

        .image-container {
          width: 100%;
          page-break-inside: avoid;
        }

        .property-image {
          width: 100%;
          height: auto;
          display: block;
        }

        .content {
          padding: 20px;
        }

        .section {
          margin-bottom: 24px;
          page-break-inside: avoid;
        }

        .section h2 {
          font-size: 16px;
          color: #1a365d;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }

        .section h3 {
          font-size: 14px;
          color: #4a5568;
          margin-bottom: 6px;
        }

        .features-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .feature-item {
          flex: 0 0 calc(50% - 6px);
          background: #f7fafc;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .feature-item .value {
          font-size: 20px;
          font-weight: bold;
          color: #2563eb;
        }

        .feature-item .label {
          font-size: 12px;
          color: #718096;
        }

        .detail-row {
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-row .label {
          font-weight: 600;
          color: #4a5568;
        }

        .description {
          color: #4a5568;
          line-height: 1.6;
        }

        .tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .tag {
          background: #edf2f7;
          color: #4a5568;
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 12px;
        }

        .tag-finance {
          background: #e6fffa;
          color: #047857;
        }

        .creator-card {
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
        }

        .creator-photo {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
          margin-bottom: 12px;
        }

        .creator-name {
          font-size: 18px;
          font-weight: bold;
          color: #1a365d;
          margin-bottom: 8px;
        }

        .creator-detail {
          font-size: 14px;
          color: #4a5568;
          margin-bottom: 4px;
        }

        .creator-bio {
          font-size: 13px;
          color: #718096;
          margin-top: 12px;
          font-style: italic;
        }

        .address {
          background: #f7fafc;
          padding: 16px;
          border-radius: 8px;
          border-left: 4px solid #2563eb;
        }

        .gravamen-item {
          background: #fff5f5;
          border: 1px solid #feb2b2;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 8px;
        }

        .planta-desc {
          background: #f7fafc;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .planta-desc h3 {
          color: #2563eb;
          margin-bottom: 8px;
        }

        .footer {
          text-align: center;
          padding: 20px;
          color: #a0aec0;
          font-size: 12px;
          border-top: 1px solid #e2e8f0;
        }

        @media print {
          .image-container {
            page-break-inside: avoid;
          }
          .section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${config.showTipo ? `<h1>${safeText(data.tipo)}${data.subtipo && config.showSubtipo ? ` - ${safeText(data.subtipo)}` : ""}</h1>` : ""}
        ${
          config.showPrecio && operacionPrincipal
            ? `
          <div class="price">
            ${formatPrice(operacionPrincipal.precio, operacionPrincipal.moneda)}
            ${operacionPrincipal.tipo_operacion === "renta" ? formatPeriod(operacionPrincipal.periodo_renta) : ""}
          </div>
          <div class="operation-type">${formatOperationType(operacionPrincipal.tipo_operacion)}</div>
        `
            : ""
        }
        ${config.showCodigo ? `<div class="code">Código: ${safeText(data.codigo_propiedad)}</div>` : ""}
      </div>

      ${imagesHtml ? `<div class="images-grid">${imagesHtml}</div>` : ""}

      <div class="content">
        ${
          config.showDireccionCompleta ||
          config.showColonia ||
          config.showCiudad ||
          config.showMunicipio ||
          config.showEstado
            ? `
          <div class="section">
            <h2>Ubicación</h2>
            <div class="address">
              ${config.showDireccionCompleta && buildAddress(data) ? `<div>${safeText(buildAddress(data))}</div>` : ""}
              ${config.showColonia && data.colonia ? `<div>${safeText(data.colonia)}</div>` : ""}
              ${
                config.showCiudad || config.showMunicipio || config.showEstado
                  ? `<div>${[
                      config.showCiudad && safeText(data.ciudad),
                      config.showMunicipio && safeText(data.municipio),
                      config.showEstado && safeText(data.estado),
                    ]
                      .filter(Boolean)
                      .join(", ")}</div>`
                  : ""
              }
            </div>
          </div>
        `
            : ""
        }

        <div class="section">
          <h2>Características</h2>
          <div class="features-grid">
            ${config.showHabitaciones ? `<div class="feature-item"><div class="value">${data.habitaciones ?? 0}</div><div class="label">Recámaras</div></div>` : ""}
            ${config.showBanos ? `<div class="feature-item"><div class="value">${data.banos ?? 0}</div><div class="label">Baños</div></div>` : ""}
            ${config.showEstacionamientos ? `<div class="feature-item"><div class="value">${data.estacionamientos ?? 0}</div><div class="label">Estacionamientos</div></div>` : ""}
            ${config.showPisos && data.pisos ? `<div class="feature-item"><div class="value">${data.pisos}</div><div class="label">Pisos</div></div>` : ""}
            ${config.showMetrosConstruccion && data.metros_cuadrados_construccion ? `<div class="feature-item"><div class="value">${data.metros_cuadrados_construccion}</div><div class="label">m² Construcción</div></div>` : ""}
            ${config.showMetrosTerreno && data.metros_cuadrados_terreno ? `<div class="feature-item"><div class="value">${data.metros_cuadrados_terreno}</div><div class="label">m² Terreno</div></div>` : ""}
          </div>

          ${
            config.showAntiguedad ||
            config.showAmueblado ||
            config.showPetFriendly
              ? `
            <div style="margin-top: 16px;">
              ${config.showAntiguedad && data.antiguedad ? `<div class="detail-row"><span class="label">Antigüedad:</span> ${safeText(data.antiguedad)}</div>` : ""}
              ${config.showAmueblado && data.amueblado ? `<div class="detail-row"><span class="label">Amueblado:</span> ${safeText(data.amueblado)}</div>` : ""}
              ${config.showPetFriendly ? `<div class="detail-row"><span class="label">Pet Friendly:</span> ${safeText(data.pet_friendly)}</div>` : ""}
            </div>
          `
              : ""
          }
        </div>

        ${
          config.showDescripcion && data.descripcion
            ? `
          <div class="section">
            <h2>Descripción</h2>
            <p class="description">${safeText(data.descripcion)}</p>
          </div>
        `
            : ""
        }

        ${plantasHtml}
        ${caracteristicasHtml}
        ${amenidadesHtml}
        ${financiamientosHtml}

        ${
          config.showMontoEnganche && data.monto_enganche
            ? `
          <div class="section">
            <h2>Información Financiera</h2>
            <div class="detail-row">
              <span class="label">Enganche:</span> ${formatPrice(data.monto_enganche)}
            </div>
          </div>
        `
            : ""
        }

        ${comisionHtml}
        ${gravamenesHtml}
        ${creatorHtml}
      </div>

      <div class="footer">
        Generado por i360 - ${new Date().toLocaleDateString("es-MX")}
      </div>
    </body>
    </html>
  `;
};

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================

export const pdfService = {
  /**
   * Genera y abre un PDF con todos los datos de la propiedad
   * @param propertyId - ID de la propiedad
   * @param includeAllData - Si es true, incluye todos los datos. Si es false, usa PDF_SIN_DATOS_OVERRIDE
   */
  async generateAndOpenPropertyPdf(
    propertyId: string,
    includeAllData: boolean = true,
  ): Promise<{ filePath: string; opened: boolean }> {
    // Obtener datos de la propiedad
    const propertyData = await fetchPropertyData(propertyId);

    if (!propertyData) {
      throw new Error("No se pudieron obtener los datos de la propiedad");
    }

    // Determinar configuración según el modo
    const config = includeAllData
      ? { ...PDF_FIELD_CONFIG }
      : { ...PDF_FIELD_CONFIG, ...PDF_SIN_DATOS_OVERRIDE };

    // Generar HTML
    let html = generatePropertyHtml(propertyData, config);
    let uri: string;

    // Intentar generar PDF, si falla por imágenes, reintentar sin ellas
    try {
      const result = await Print.printToFileAsync({
        html,
        base64: false,
      });
      uri = result.uri;
    } catch (printError) {
      console.warn(
        "Error generando PDF con imágenes, reintentando sin imágenes:",
        printError,
      );

      // Reintentar sin imágenes
      const configWithoutImages = {
        ...config,
        showImagenes: false,
        showFotoCreador: false,
      };
      html = generatePropertyHtml(propertyData, configWithoutImages);

      const result = await Print.printToFileAsync({
        html,
        base64: false,
      });
      uri = result.uri;
    }

    // Mover a un nombre más descriptivo
    const fileName = `propiedad_${safeText(propertyData.codigo_propiedad) || propertyId}_${Date.now()}.pdf`;
    const newPath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.moveAsync({
      from: uri,
      to: newPath,
    });

    // Intentar compartir/abrir el PDF
    let opened = false;

    if (await Sharing.isAvailableAsync()) {
      try {
        await Sharing.shareAsync(newPath, {
          mimeType: "application/pdf",
          dialogTitle: `Propiedad ${propertyData.codigo_propiedad || ""}`,
          UTI: "com.adobe.pdf",
        });
        opened = true;
      } catch (error) {
        console.error("Error sharing PDF:", error);
      }
    }

    // Fallback a react-native-file-viewer si sharing no funcionó
    if (!opened) {
      try {
        const FileViewer = require("react-native-file-viewer");
        if (FileViewer?.default?.open) {
          await FileViewer.default.open(newPath, {
            showOpenWithDialog: true,
            showAppsSuggestions: true,
          });
          opened = true;
        }
      } catch (error) {
        console.warn("FileViewer not available:", error);
      }
    }

    return { filePath: newPath, opened };
  },

  /**
   * Obtiene la configuración actual de campos del PDF
   */
  getFieldConfig() {
    return { ...PDF_FIELD_CONFIG };
  },

  /**
   * Obtiene la configuración de "Sin Datos"
   */
  getSinDatosOverride() {
    return { ...PDF_SIN_DATOS_OVERRIDE };
  },
};
