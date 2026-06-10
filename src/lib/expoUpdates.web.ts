// Shim no-op para web: expo-updates es un módulo solo-nativo.
export const checkForUpdateAsync = async () => ({ isAvailable: false });
export const fetchUpdateAsync = async () => {};
export const reloadAsync = async () => {};
