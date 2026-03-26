/**
 * Expo yapılandırması. app.json ile aynı içerik; proje kökündeki .env dosyası
 * çözülmeden önce yüklenir (fiziksel cihazda EXPO_PUBLIC_API_URL için).
 */
const { loadProjectEnv } = require("@expo/env");

loadProjectEnv(__dirname, { mode: process.env.NODE_ENV || "development" });

const appJson = require("./app.json");

/** extra.apiUrl — bazı cihazlarda process.env ile aynı değeri runtime’da da verir (Metro / native manifest). */
module.exports = {
    expo: {
        ...appJson.expo,
        extra: {
            ...(appJson.expo.extra || {}),
            apiUrl: process.env.EXPO_PUBLIC_API_URL || undefined,
        },
    },
};
