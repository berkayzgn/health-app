const { withInfoPlist } = require('expo/config-plugins');

/**
 * DEV-ONLY: Belirli IP'ler için HTTP (cleartext) bağlantıya izin verir.
 * Production build'de (`NODE_ENV=production` veya `EAS_BUILD_PROFILE=production`)
 * hiçbir şey yapmaz — sunucu HTTPS olduğunda bu kurala gerek yok.
 */
const withAllowHTTP = (config) => {
  const isProduction =
    process.env.EAS_BUILD_PROFILE === 'production' ||
    process.env.NODE_ENV === 'production';

  if (isProduction) {
    return config;
  }

  return withInfoPlist(config, (cfg) => {
    if (!cfg.modResults.NSAppTransportSecurity) {
      cfg.modResults.NSAppTransportSecurity = {};
    }

    const ats = cfg.modResults.NSAppTransportSecurity;
    if (!ats.NSExceptionDomains) {
      ats.NSExceptionDomains = {};
    }

    // Geliştirme sunucusu IP'si — production'da bu kural devreye girmez.
    ats.NSExceptionDomains['165.245.209.17'] = {
      NSExceptionAllowsInsecureHTTPLoads: true,
      NSIncludesSubdomains: true,
    };

    return cfg;
  });
};

module.exports = withAllowHTTP;
