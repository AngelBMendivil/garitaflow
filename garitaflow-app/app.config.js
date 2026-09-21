const fs = require('fs');

// google-services.json no va al repositorio (está en .gitignore). En EAS llega
// como variable secreta de tipo archivo (GOOGLE_SERVICES_JSON); en local se usa
// la copia de esta carpeta si existe. Sin este archivo Android no puede
// registrarse en FCM: getExpoPushTokenAsync falla y el servidor no tiene a
// quién mandarle avisos, que es justo lo que pasó hasta septiembre de 2026.
module.exports = ({ config }) => {
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ||
    (fs.existsSync('./google-services.json') ? './google-services.json' : undefined);

  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
