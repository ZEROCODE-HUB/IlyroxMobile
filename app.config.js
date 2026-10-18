/**
 * app.config.js
 *
 * Toma `app.json` tal cual y le inyecta la clave de Google Maps de Android
 * desde el entorno, para no versionarla.
 *
 * De dónde sale:
 *  - En local, del `.env` (gitignored), que Expo carga automáticamente.
 *  - En EAS, de las environment variables del proyecto (`eas env:list`),
 *    asociadas a cada perfil de build por su campo `environment` en eas.json.
 *
 * Si la variable no está definida no se emite la clave: es preferible un mapa
 * sin API key —y su error explícito— a un placeholder que parezca válido.
 *
 * iOS NO lleva clave de Google Maps a propósito: en iOS todos los mapas usan
 * Apple Maps (`PROVIDER_DEFAULT`). Además, si `ios.config.googleMapsApiKey`
 * existe, el plugin de mapas de Expo inyecta `pod 'react-native-google-maps'`
 * en el Podfile, y ese pod ya no existe en react-native-maps >= 1.21 → el
 * `pod install` de EAS falla. Si algún día se usa Google Maps en iOS, hay que
 * configurarlo con el plugin propio de `react-native-maps`, no con esta clave.
 *
 * Ojo: la clave acaba dentro del binario de todos modos. Sacarla del
 * repositorio evita el escaneo automático, pero la protección real son las
 * restricciones por package / SHA-1 en Google Cloud Console.
 */

const ANDROID_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...(config.android?.config ?? {}),
      ...(ANDROID_MAPS_KEY ? { googleMaps: { apiKey: ANDROID_MAPS_KEY } } : {}),
    },
  },
});
