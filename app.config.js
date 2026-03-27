/**
 * Expo yapılandırması. app.json ile aynı içerik; proje kökündeki .env dosyaları
 * çözülmeden önce yüklenir (fiziksel cihazda EXPO_PUBLIC_API_URL için).
 *
 * expo run:ios sırasında NODE_ENV tanımlı olmayabileceğinden her iki .env dosyasını
 * manuel olarak yüklüyoruz.
 */
const path = require("path");
const fs   = require("fs");

function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (key && !(key in process.env)) {
            process.env[key] = val;
        }
    }
}

// Önce .env, sonra .env.development (override eder)
loadEnvFile(path.join(__dirname, ".env"));
loadEnvFile(path.join(__dirname, ".env.development"));

const appJson = require("./app.json");

const apiUrl = process.env.EXPO_PUBLIC_API_URL || undefined;

if (apiUrl) {
    console.log("[app.config] EXPO_PUBLIC_API_URL =", apiUrl);
} else {
    console.warn("[app.config] EXPO_PUBLIC_API_URL tanımlı değil — api.ts auto-detect kullanacak.");
}

/** extra.apiUrl — runtime'da Constants.expoConfig.extra.apiUrl üzerinden okunur. */
module.exports = {
    expo: {
        ...appJson.expo,
        extra: {
            ...(appJson.expo.extra || {}),
            apiUrl,
        },
    },
};
