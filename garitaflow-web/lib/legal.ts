/**
 * Datos que aparecen en el aviso de privacidad, los términos y la página de
 * eliminación de cuenta. Centralizados aquí para no tener que editarlos en tres
 * lugares distintos.
 *
 * ⚠️ PENDIENTES antes de publicar en Google Play:
 *   - RESPONSABLE: nombre legal real (persona física o razón social).
 *   - CONTACTO_EMAIL: buzón que de verdad reciba (ver ImprovMX).
 *   - DOMICILIO: la LFPDPPP lo pide en el aviso de privacidad.
 */

export const LEGAL = {
  APP: 'GaritaFlow',
  SITIO: 'https://garitaflow.com',

  /** Persona física. */
  RESPONSABLE: 'Ángel de Jesús Barreras Mendívil',

  /** Buzón de Zoho Mail sobre el dominio propio. */
  CONTACTO_EMAIL: 'privacidad@garitaflow.com',

  /**
   * Se publica solo ciudad y estado, no la dirección exacta: es lo habitual al
   * operar como persona física y evita exponer un domicilio particular.
   */
  DOMICILIO: 'San Diego, California, Estados Unidos',

  /** Fecha de última actualización mostrada al usuario. */
  VIGENCIA: '16 de agosto de 2026',
} as const

/** Categorías de datos que la app realmente recolecta, según el backend. */
export const DATOS_RECOLECTADOS = [
  {
    categoria: 'Identidad y cuenta',
    detalle:
      'Correo electrónico, nombre y contraseña cifrada. Si entras con Google: tu identificador de Google, correo, nombre y foto de perfil.',
    finalidad: 'Crear y mantener tu cuenta, autenticarte y permitirte recuperar el acceso.',
  },
  {
    categoria: 'Ubicación precisa',
    detalle:
      'Latitud, longitud y margen de exactitud, obtenidos únicamente mientras la app está abierta. Nunca en segundo plano.',
    finalidad:
      'Detectar si estás en la fila de una garita, validar que los reportes provengan de quien está ahí, y terminar tu cronómetro de cruce.',
  },
  {
    categoria: 'Historial de cruces',
    detalle: 'Garita, carril, fecha, hora de inicio y fin, y duración de cada cruce que registres.',
    finalidad:
      'Mostrarte tu historial y calcular promedios comunitarios de espera. Los promedios se publican de forma agregada, nunca identificándote.',
  },
  {
    categoria: 'Horarios recurrentes',
    detalle: 'Días de la semana y hora de los cruces que programes como alarma.',
    finalidad: 'Programar tus avisos previos al cruce.',
  },
  {
    categoria: 'Reportes a la comunidad',
    detalle:
      'El tipo de incidencia que reportas (fila lenta, carril cerrado, etc.), con la ubicación desde la que lo reportas.',
    finalidad: 'Informar a otros usuarios sobre el estado de la fila en tiempo real.',
  },
  {
    categoria: 'Preferencias de perfil',
    detalle:
      'Ciudad, garita favorita, tipo y color de vehículo, avatar, y si cuentas con SENTRI.',
    finalidad: 'Personalizar la información que ves y las estimaciones que te mostramos.',
  },
  {
    categoria: 'Identificador de notificaciones',
    detalle: 'Un token único que tu dispositivo genera para recibir avisos.',
    finalidad: 'Enviarte notificaciones. No permite identificarte fuera de la app.',
  },
  {
    categoria: 'Diagnóstico técnico',
    detalle:
      'Sistema operativo, errores de conexión y mensajes de fallo, sin contenido de tus comunicaciones.',
    finalidad: 'Detectar y corregir fallas de la aplicación.',
  },
] as const
