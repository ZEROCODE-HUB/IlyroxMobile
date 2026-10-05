/**
 * shareText.ts
 *
 * Limpieza del texto que va dentro del mensaje nativo de compartir.
 *
 * El problema: `descripcion` se guarda como texto plano con saltos de línea
 * (viene de un `AppInput multiline`), y el mensaje se armaba con la cadena
 * cruda. Eso producía textos larguísimos y con los `\n\n` del campo pegados en
 * medio. Peor: varios call sites truncaban con `.substring(0, 100)`, que corta
 * A MEDIA PALABRA ("…construcción, con espacios ampios y una distribu…").
 *
 * Este helper deja una sola línea prolija y corta en un límite de palabra.
 * Se aplica en `useShare.shareContent` como red de seguridad, para que ningún
 * call site (presente o futuro) pueda mandar un texto roto.
 */

/** Separadores que solemos dejar colgando al final ("casa -", "casa •"). */
const TRAILING_NOISE = /[\s\-–—•·|:;.,]+$/u;

/**
 * Emoji/símbolos SOLOS al final, precedidos de espacio (✨, 🚀, 👋, ⭐…).
 * Incluye el selector de variación (U+FE0F) y el ZWJ (U+200D) porque los
 * emojis compuestos los usan entre códigos.
 */
const TRAILING_EMOJI =
  /[\s]+[\p{Extended_Pictographic}\p{Emoji_Presentation}︎‍]+$/u;

/**
 * Quita etiquetas HTML y decodifica las entidades más comunes.
 * Hay descripciones que llegan copiadas de un CMS (EasyBroker) con HTML.
 */
function stripHtml(input: string): string {
  return input
    .replace(/<\s*br\s*\/?\s*>/gi, " ")
    .replace(/<\s*\/\s*(p|div|li|h[1-6])\s*>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(
      /&(?:amp|lt|gt|quot|apos|nbsp|#39);/g,
      (m) =>
        ({
          "&amp;": "&",
          "&lt;": "<",
          "&gt;": ">",
          "&quot;": '"',
          "&apos;": "'",
          "&nbsp;": " ",
          "&#39;": "'",
        })[m] ?? " ",
    );
}

/** Corta en un límite de palabra. Si no hay palabra que cortar, corta duro. */
function truncateAtWord(text: string, maxLength: number, ellipsis: string) {
  if (text.length <= maxLength) return text;

  const slice = text.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");

  // Si el último espacio está muy al inicio es que es UNA palabra muy larga
  // (un token, una URL): en ese caso cortar duro es mejor que perder casi todo.
  const base =
    lastSpace > maxLength * 0.5 ? slice.slice(0, lastSpace) : slice;

  return `${base.replace(TRAILING_NOISE, "")}${ellipsis}`;
}

/**
 * Deja el texto listo para un mensaje de compartir:
 *
 *  1. Sin HTML.
 *  2. Una sola línea (los `\n\n` de párrafos se vuelven un espacio).
 *  3. Sin espacios repetidos ni emoji colgando al final.
 *  4. Cortado en un límite de palabra, con `…`.
 *
 * @param raw       Texto original (puede ser null/undefined/vacío).
 * @param maxLength Largo máximo. Por defecto 160: WhatsApp, SMS y las hojas de
 *                  compartir recortan alrededor de ahí, y más allá el texto se
 *                  ve cortado con fe.
 * @param fallback  Texto a devolver si `raw` queda vacío tras limpiar.
 */
export function toShareText(
  raw?: string | null,
  maxLength = 160,
  fallback = "",
): string {
  if (!raw) return fallback;

  let out = stripHtml(String(raw))
    // Todo whitespace (incluidos \r\n) a un espacio simple.
    .replace(/\s+/g, " ")
    .trim();

  // Emojis/símbolos sueltos al final, y luego puntuación colgando ("casa -").
  out = out.replace(TRAILING_EMOJI, "").replace(TRAILING_NOISE, "");

  if (!out) return fallback;

  return truncateAtWord(out, maxLength, "…");
}