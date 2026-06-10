// Capa de abstracción tolerante sobre expo-updates (solo nativo).
//
// El módulo nativo ExpoUpdates solo existe en builds que incluyen expo-updates
// (preview/production). En un dev build compilado SIN él, importar "expo-updates"
// de forma estática tira "Cannot find native module 'ExpoUpdates'" al cargar el
// módulo y rompe toda la app (cascada de errores en _layout). Por eso lo
// cargamos de forma perezosa y tolerante: si el módulo nativo no está presente,
// las funciones son no-op.
//
// En web, Metro resuelve automáticamente expoUpdates.web.ts (shim no-op).

type ExpoUpdatesModule = typeof import("expo-updates");

let updates: ExpoUpdatesModule | null = null;
try {
  // require diferido: si el módulo nativo no existe, el catch evita el crash.
  updates = require("expo-updates") as ExpoUpdatesModule;
} catch {
  updates = null;
}

export const checkForUpdateAsync = async () => {
  if (!updates) return { isAvailable: false };
  return updates.checkForUpdateAsync();
};

export const fetchUpdateAsync = async () => {
  if (!updates) return;
  await updates.fetchUpdateAsync();
};

export const reloadAsync = async () => {
  if (!updates) return;
  await updates.reloadAsync();
};
