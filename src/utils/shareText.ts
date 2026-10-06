/**
 * shareText.ts
 *
 * Limpieza del texto que va dentro del mensaje nativo de compartir.
 *
 * El problema original: `descripcion` llegaba como texto plano con saltos de
 * línea (viene de un `AppInput multiline`) y el mensaje se armaba con la cadena
 * cruda, con espacios repetidos y call sites que cortaban con
 * `.substring(0, 100)` partiendo palabras a la mitad.
 *
 * Este helper deja el texto prolijo Y CONSERVA los saltos de línea del campo:
 * los párrafos que el usuario escribió tienen que llegar igual a WhatsApp,
 * Facebook, etc. Solo se normaliza lo que sí es ruido:
 *
 *  - HTML (etiquetas y entidades) → texto plano; un `<br>`/`</p>` es salto real.
 *  - `\r\n`/`\r` → `\n`.
 *  - Espacios repetidos DENTRO de cada línea.
 *  - Bloques de líneas en blanco seguidas → una sola; sin blancas en los extremos.
 *  - Corte en un límite de palabra, con `…`.
 *
 * Se aplica en `useShare.shareContent` como red de seguridad, para que ningún
 * call site (presente o futuro) mande un texto roto.
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
 * Un `<br>` o el cierre de un párrafo es un salto de línea REAL: se conserva
 * como `\n` en vez de volverse espacio.
 */
function stripHtml(input: string): string {
  return input
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|li|h[1-6])\s*>/gi, "\n")
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
 * Deja el texto listo para un mensaje de compartir, CONSERVANDO los saltos de
 * línea del campo:
 *
 *  1. Sin HTML (`<br>`/`</p>` → salto de línea).
 *  2. `\r\n`/`\r` → `\n`; espacios repetidos colapsados DENTRO de cada línea.
 *  3. Bloques de líneas en blanco seguidas → una sola línea en blanco;
 *     sin líneas en blanco al inicio ni al final.
 *  4. Sin emoji colgando al final ni puntuación suelta ("casa -").
 *  5. Cortado en un límite de palabra, con `…`.
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

  const lines = stripHtml(String(raw))
    .replace(/\r\n?/g, "\n")
    .split("\n")
    // Cualquier whitespace DENTRO de la línea (espacios, tabs, NBSP de copiar
    // y pegar) a un solo espacio. No se usa `\s` a secas porque incluye `\n`,
    // que es justo lo que queremos conservar.
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim());

  // Máximo UNA línea en blanco seguida, y nada de blancas en los extremos.
  const collapsed: string[] = [];
  for (const line of lines) {
    if (line === "" && (collapsed.length === 0 || collapsed[collapsed.length - 1] === "")) {
      continue;
    }
    collapsed.push(line);
  }
  while (collapsed.length > 0 && collapsed[collapsed.length - 1] === "") {
    collapsed.pop();
  }

  let out = collapsed.join("\n");

  // Emojis/símbolos sueltos al final, y luego puntuación colgando ("casa -").
  out = out.replace(TRAILING_EMOJI, "").replace(TRAILING_NOISE, "");

  if (!out) return fallback;

  return truncateAtWord(out, maxLength, "…");
}