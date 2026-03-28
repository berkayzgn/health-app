/**
 * Expo yapılandırması. Proje kökündeki .env dosyalarını yükler.
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

loadEnvFile(path.join(__dirname, ".env"));
loadEnvFile(path.join(__dirname, ".env.development"));

const appJson = require("./app.json");

const apiUrl = process.env.EXPO_PUBLIC_API_URL || undefined;

if (apiUrl) {
    console.log("[app.config] EXPO_PUBLIC_API_URL =", apiUrl);
} else {
    console.error("[app.config] EXPO_PUBLIC_API_URL tanımlı değil!");
}

module.exports = {
    expo: {
        ...appJson.expo,
        extra: {
            ...(appJson.expo.extra || {}),
            apiUrl,
        },
    },
};
