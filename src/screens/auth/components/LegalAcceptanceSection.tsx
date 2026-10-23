import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { Modal } from "@/design-system/components/Modal";
import { Button } from "@/design-system/components";
import { COLORS } from "@/constants/colors";
import { LEGAL_URLS } from "@/constants/legal";

interface LegalCheckboxItem {
  key: "acceptedTerms" | "acceptedPrivacy" | "acceptedAge" | "acceptedMarketing";
  label: string;
  required: boolean;
  documentUrl?: string;
  documentTitle?: string;
  documentContent?: string;
}

const LEGAL_ITEMS: LegalCheckboxItem[] = [
  {
    key: "acceptedTerms",
    label: "Acepto los Términos y Condiciones de ILYROX",
    required: true,
    documentUrl: LEGAL_URLS.terms,
    documentTitle: "Términos y Condiciones de ILYROX",
    documentContent: `
TÉRMINOS Y CONDICIONES DE USO
App, sitio web, red profesional, leads, cursos, reseñas, pagos y funciones de inteligencia artificial

1. Aceptación y alcance
Al crear una cuenta, acceder o utilizar ILYROX, el Usuario acepta estos Términos, la Política de Privacidad, las Community Guidelines y las políticas o condiciones específicas aplicables a una función, compra o rol. La aceptación podrá recabarse mediante mecanismos electrónicos verificables. Cuando una autorización deba ser expresa, se utilizará una acción afirmativa, como un checkbox no pre-marcado, botón de aceptación o mecanismo equivalente.

2. Definiciones
Usuario: persona mayor de edad que accede al Sitio, crea una cuenta o utiliza los Servicios.
Profesional: asesor inmobiliario, inmobiliaria, constructor, arquitecto, Instructor, proveedor u otro participante profesional.
Instructor o Creador: persona física o moral que registra, ofrece o suministra a través de ILYROX un Curso propio o respecto del cual cuenta con los derechos, licencias y autorizaciones suficientes.
Curso o Producto Digital: contenido educativo o informativo ofrecido mediante ILYROX, incluyendo clases, videos, documentos, sesiones, comunidades, evaluaciones o materiales asociados.

3. Elegibilidad y capacidad
ILYROX está destinado exclusivamente a personas de 18 años o más. Al registrarse, el Usuario declara tener capacidad legal suficiente y proporcionar información veraz.

4. Naturaleza del servicio inmobiliario
ILYROX es una plataforma tecnológica de publicación, networking y herramientas para profesionales inmobiliarios. No es propietario de los inmuebles, no actúa como notario, valuador, institución financiera ni parte de contratos celebrados entre Usuarios o terceros.

5. Reglas de uso y conductas prohibidas
Queda prohibido publicar información falsa, engañosa o fraudulenta, infringir derechos de terceros, acosar, amenazar, discriminar, hacer scraping, introducir malware, manipular métricas, ofrecer cursos con promesas garantizadas de ingresos, entre otras conductas.

6. Limitación de responsabilidad
En la máxima medida permitida por la ley, ILYROX no será responsable por decisiones independientes de Usuarios o terceros, información publicada por ellos, incumplimientos entre partes, pérdida de oportunidades, actos fuera de la plataforma, servicios de terceros o daños indirectos.

Ley aplicable: Leyes de los Estados Unidos Mexicanos. Jurisdicción: Aguascalientes, México.
    `,
  },
  {
    key: "acceptedPrivacy",
    label: "He leído la Política de Privacidad",
    required: true,
    documentUrl: LEGAL_URLS.privacy,
    documentTitle: "Política de Privacidad de ILYROX",
    documentContent: `
POLÍTICA DE PRIVACIDAD INTEGRAL
Versión 10.2

1. Responsable
ILYROX TECHNOLOGIES, S.A.P.I. DE C.V., RFC ITE2608279M7
Domicilio: Juan Morales 1319, Col. Hacienda los Morales, San Nicolás de los Garza, Nuevo León, C.P. 66495
Contacto: privacidad@ilyrox.com

2. Datos que recabamos
Datos de identidad: nombre, apellidos, email, teléfono, foto, fecha de nacimiento.
Datos profesionales: ocupación, modalidad, inmobiliaria, fecha inicio carrera, biografía, RFC, constancia fiscal.
Datos de uso: navegación, búsquedas, interacciones, leads, mensajes, citas, preferencias.
Datos técnicos: IP, dispositivo, logs, identificadores publicitarios, ubicación (si se autoriza).
Datos de pagos: información de facturación, historial de compras, comisiones.

3. Finalidades y base legal
- Prestar los Servicios (ejecución de contrato): registro, perfil, publicación, CRM, mensajería, leads, citas, pagos, cursos.
- Seguridad y prevención de fraude (interés legítimo): autenticación, controles de acceso, detección de abuso.
- Comunicaciones necesarias (ejecución de contrato / obligación legal): cuenta, seguridad, soporte, citas, leads, compras, facturación, acceso a cursos, avisos legales.
- Marketing (consentimiento): promociones, novedades, mensajes comerciales. Requiere checkbox separado no pre-marcado.
- Analytics e estudios agregados (interés legítimo): estadísticas disociadas sobre oferta, demanda, tendencias.
- Cumplimiento legal (obligación legal): respuesta a autoridades, retención de evidencia.

4. Transferencias
- Profesionales que reciben leads: solo con consentimiento del titular.
- Instructores: datos de compradores necesarios para entregar/soportar el curso.
- Proveedores de servicios: hosting, pagos, mapas, mensajería, IA, analítica, push (encargados de tratamiento).
- Autoridades: cuando la ley lo exija.

5. Derechos ARCO
Acceso, Rectificación, Cancelación, Oposición, Portabilidad, Limitación. Ejercicio: privacidad@ilyrox.com

6. Retención
Datos de cuenta: mientras la cuenta esté activa + periodo legal.
Datos de transacciones: 10 años (código de comercio/fiscal).
Logs de seguridad: 2 años.
Marketing: hasta revocación.

7. Seguridad infantil
Designación de responsable interno. Reporte prioritario CSAM a seguridad@ilyrox.com.
    `,
  },
  {
    key: "acceptedAge",
    label: "Confirmo que tengo 18 años o más",
    required: true,
    documentTitle: "Confirmación de mayoría de edad",
    documentContent: `
CONFIRMACIÓN DE MAYORÍA DE EDAD

ILYROX es una plataforma destinada exclusivamente a personas mayores de 18 años.

Al marcar esta casilla, declaras bajo protesta de decir verdad que:
- Tienes 18 años cumplidos o más al momento de crear tu cuenta.
- Tienes capacidad legal suficiente para contratar y obligarte conforme a las leyes mexicanas.
- La información que proporcionas es veraz y completa.

Si se detecta que un usuario es menor de 18 años, su cuenta será suspendida inmediatamente y se procederá a la eliminación de sus datos conforme a la legislación aplicable en materia de protección de datos de menores.

Esta confirmación es un requisito indispensable para el uso de la plataforma y forma parte de los mecanismos de verificación de identidad y prevención de fraude.
    `,
  },
  {
    key: "acceptedMarketing",
    label: "Deseo recibir comunicaciones comerciales y promocionales",
    required: false,
    documentUrl: LEGAL_URLS.communications,
    documentTitle: "Autorización y Preferencias de Contacto",
    documentContent: `
AUTORIZACIÓN Y PREFERENCIAS DE CONTACTO
Versión 1.2

1. Alcance
Esta autorización es independiente y opcional. No afecta tu registro ni el uso de las funciones básicas de ILYROX.

2. Qué autorizas
Recibir comunicaciones promocionales, novedades, ofertas, descuentos, invitaciones a eventos, encuestas y contenido comercial a través de:
- Email
- Notificaciones push en la app
- WhatsApp / SMS (si proporcionas tu número y autorizas expresamente)
- Llamadas telefónicas (solo para ofertas relevantes y con tu consentimiento previo)

3. Qué NO implica
- No cedemos tus datos a terceros para sus propios fines de marketing.
- No condicionamos el servicio a esta autorización.
- Puedes revocarla en cualquier momento desde Configuración > Preferencias de contacto o respondiendo "BAJA" a cualquier mensaje.

4. Lista de bajas centralizada
Una vez revocada, tus datos se añaden a una lista de supresión que impide re-ingreso por importación, automatización, CRM o campañas sin nueva base legal.

5. WhatsApp Business
Si autorizas WhatsApp, usamos la API oficial de Meta. Los mensajes siguen sus políticas y plantillas aprobadas. Puedes bloquear el chat en cualquier momento.
    `,
  },
];

export function LegalAcceptanceSection({
  formState,
  onUpdateField,
}: {
  formState: {
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
    acceptedAge: boolean;
    acceptedMarketing: boolean;
  };
  onUpdateField: <K extends keyof typeof formState>(
    field: K,
    value: typeof formState[K]
  ) => void;
}) {
  const [openDocKey, setOpenDocKey] = useState<string | null>(null);

  const handleToggle = (key: LegalCheckboxItem["key"]) => {
    const currentValue = formState[key];
    onUpdateField(key, !currentValue);
  };

  const openDocument = (item: LegalCheckboxItem) => {
    if (item.documentUrl || item.documentContent) {
      setOpenDocKey(item.key);
    }
  };

  const closeDocument = () => {
    setOpenDocKey(null);
  };

  const openInBrowser = (url: string) => {
    WebBrowser.openBrowserAsync(url).catch(() => {});
    closeDocument();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>
        Aceptaciones y confirmaciones <Text style={styles.required}>*</Text>
      </Text>

      <Text style={styles.sectionSubtitle}>
        Por favor lee cada documento antes de aceptar. Los marcados con * son obligatorios.
      </Text>

      {LEGAL_ITEMS.map((item) => (
        <View key={item.key} style={styles.itemContainer}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => handleToggle(item.key)}
            activeOpacity={0.8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: formState[item.key] }}
            accessibilityLabel={
              `${item.label} ${item.required ? "obligatorio" : "opcional"}`
            }
          >
            <View
              style={[
                styles.checkbox,
                formState[item.key] && styles.checkboxChecked,
              ]}
            >
              {formState[item.key] && (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={COLORS.white}
                  style={styles.checkIcon}
                />
              )}
            </View>

            <View style={[styles.labelContainer, { flex: 1 }]}>
              <Text
                style={[
                  styles.label,
                  item.required && styles.labelRequired,
                ]}
                numberOfLines={2}
              >
                {item.label} {item.required && <Text style={styles.asterisk}>*</Text>}
              </Text>
              {item.documentUrl || item.documentContent ? (
                <TouchableOpacity
                  onPress={() => openDocument(item)}
                  style={styles.readLink}
                  activeOpacity={0.7}
                >
                  <Text style={styles.readLinkText}>
                    <Ionicons
                      name="document-text-outline"
                      size={13}
                      color={COLORS.primary}
                      style={{ marginRight: 4 }}
                    />
                    Leer documento completo
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
        <Text style={styles.infoText}>
          Tu nombre, ocupación, foto de perfil, biografía, estado y reseñas serán visibles públicamente.
          Tu email, teléfono, dirección exacta y datos fiscales NUNCA se publican.
        </Text>
      </View>

      {openDocKey && (
        <LegalDocumentModal
          visible={true}
          onClose={closeDocument}
          item={LEGAL_ITEMS.find((i) => i.key === openDocKey)!}
          onOpenInBrowser={openInBrowser}
        />
      )}
    </View>
  );
}

interface LegalDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  item: LegalCheckboxItem;
  onOpenInBrowser: (url: string) => void;
}

function LegalDocumentModal({
  visible,
  onClose,
  item,
  onOpenInBrowser,
}: LegalDocumentModalProps) {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      variant="center"
      title={item.documentTitle}
      showCloseButton={true}
      contentStyle={{
        maxHeight: "80%",
        width: "90%",
        maxWidth: 500,
      }}
    >
      <ScrollView
        contentContainerStyle={styles.modalContent}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.modalText}>{item.documentContent}</Text>
        {item.documentUrl && (
          <View style={styles.modalActions}>
            <Button
              label="Abrir en navegador"
              variant="outline"
              size="md"
              onPress={() => onOpenInBrowser(item.documentUrl!)}
              style={styles.modalButton}
            />
          </View>
        )}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  required: {
    color: COLORS.error,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 17,
  },
  itemContainer: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkIcon: {
    marginTop: -1,
  },
  labelContainer: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    flex: 1,
  },
  labelRequired: {
    fontWeight: "600",
  },
  asterisk: {
    color: COLORS.error,
    marginLeft: 2,
  },
  readLink: {
    paddingTop: 2,
  },
  readLinkText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
    flexDirection: "row",
    alignItems: "center",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: COLORS.primaryTransparent,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  modalContent: {
    paddingHorizontal: 4,
    paddingBottom: 16,
    gap: 16,
  },
  modalText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  modalActions: {
    paddingTop: 8,
    alignItems: "center",
  },
  modalButton: {
    minWidth: 200,
  },
});