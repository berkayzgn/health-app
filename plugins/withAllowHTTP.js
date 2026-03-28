const { withInfoPlist } = require('expo/config-plugins');

/**
 * Expo build sırasında belirli domain/IP'ler için HTTP (cleartext) bağlantıya izin verir.
 * NSExceptionDomains kullanır çünkü Expo, NSAllowsArbitraryLoads'u override eder.
 */
const withAllowHTTP = (config) => {
  return withInfoPlist(config, (config) => {
    if (!config.modResults.NSAppTransportSecurity) {
      config.modResults.NSAppTransportSecurity = {};
    }

    const ats = config.modResults.NSAppTransportSecurity;
    
    if (!ats.NSExceptionDomains) {
      ats.NSExceptionDomains = {};
    }

    // Uzak sunucu IP'si için HTTP'ye izin ver
    ats.NSExceptionDomains['165.245.209.17'] = {
      NSExceptionAllowsInsecureHTTPLoads: true,
      NSIncludesSubdomains: true,
    };

    return config;
  });
};

module.exports = withAllowHTTP;
