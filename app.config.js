/**
 * app.config.js
 *
 * Toma `app.json` tal cual y le inyecta las claves de Google Maps desde el
 * entorno, para no versionarlas.
 *
 * De dónde salen:
 *  - En local, del `.env` (gitignored), que Expo carga automáticamente.
 *  - En EAS, de las environment variables del proyecto (`eas env:list`),
 *    asociadas a cada perfil de build por su campo `environment` en eas.json.
 *
 * Si la variable no está definida no se emite la clave: es preferible un mapa
 * sin API key —y su error explícito— a un placeholder que parezca válido.
 *
 * Ojo: estas claves acaban dentro del binario de todos modos. Sacarlas del
 * repositorio evita el escaneo automático, pero la protección real son las
 * restricciones por bundle ID / SHA-1 en Google Cloud Console.
 */

const IOS_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY;
const ANDROID_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;

module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    config: {
      ...(config.ios?.config ?? {}),
      ...(IOS_MAPS_KEY ? { googleMapsApiKey: IOS_MAPS_KEY } : {}),
    },
  },
  android: {
    ...config.android,
    config: {
      ...(config.android?.config ?? {}),
      ...(ANDROID_MAPS_KEY ? { googleMaps: { apiKey: ANDROID_MAPS_KEY } } : {}),
    },
  },
});
