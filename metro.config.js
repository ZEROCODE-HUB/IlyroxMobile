const { getDefaultConfig } = require("expo/metro-config");

// Usamos __dirname en lugar de rutas absolutas manuales
module.exports = getDefaultConfig(__dirname);
