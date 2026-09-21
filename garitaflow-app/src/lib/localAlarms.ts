import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { flowIndexApi, recurringApi } from './api';

/**
 * Alarmas locales programadas (tipo despertador).
 *
 * Antes las alarmas de cruce recurrente dependían por completo del push remoto:
 * el backend evaluaba en `/cron/evaluate-alarms` y disparaba vía Expo/FCM. Si el
 * cron no corría —que es justo lo que está pasando— la alarma simplemente nunca
 * sonaba y el usuario no se enteraba.
 *
 * Esto programa la alarma en el teléfono, así que suena aunque el servidor esté
 * caído, sin red y sin FCM. El push remoto se queda como capa extra para avisos
 * reactivos (la fila bajó ahora mismo), no como el único camino.
 */

/** Canal dedicado: importancia máxima para que Android no lo silencie. */
export const ALARM_CHANNEL_ID = 'crossing-alarms';

/** Marca en `content.data` para distinguir lo nuestro de cualquier otra notificación. */
const TAG = 'gf_recurring';

export interface RecurringRule {
  id: string;
  port_id: number | string;
  port_name?: string;
  lane_type?: string;
  mode?: string;
  days_of_week?: number[];   // 0=Dom .. 6=Sáb (misma convención que el backend)
  target_time?: string;      // 'HH:MM' hora local
  lead_minutes?: number;
  active?: boolean;
}

export async function ensureAlarmChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'Alarmas de cruce',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#0049EC',
    });
  } catch {
    // Expo Go u otra limitación → se ignora
  }
}

function parseHHMM(s?: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((s ?? '').trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

/**
 * Resta el aviso previo a la hora objetivo. Si cruza la medianoche, la alarma
 * cae en el día anterior (05:00 con 45 min de aviso = 04:15 el mismo día;
 * 00:20 con 45 min = 23:35 del día previo).
 */
function shiftBack(dow: number, h: number, m: number, leadMinutes: number) {
  let total = h * 60 + m - leadMinutes;
  let day = dow;
  while (total < 0) {
    total += 24 * 60;
    day = (day + 6) % 7;
  }
  return { dow: day, hour: Math.floor(total / 60) % 24, minute: total % 60 };
}

/**
 * Espera típica por día de semana y hora (de /flow-index/:id/weekly).
 *
 * Una alarma local se programa con el texto ya escrito: a la hora de sonar el
 * teléfono no sabe cómo está la fila. Lo más útil que puede decir sin servidor
 * es cómo SUELE estar ese día a esa hora, y lo dice como "suele", no como dato
 * en vivo. Se recalcula cada vez que se reprograman las alarmas (al abrir la
 * app), así que el promedio se mantiene al día.
 */
type TypicalCell = { avg: number; n: number } | null;
export interface TypicalWeek {
  week: TypicalCell[][]; // [dow 0=dom][hora]
  byHour: TypicalCell[]; // todos los días juntos, de respaldo
}

/** Una celda con menos lecturas que esto no es representativa. */
const MIN_SAMPLES = 10;

const DIAS = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
const LANE_LABEL: Record<string, string> = { GENERAL: 'General', READY: 'Ready Lane', SENTRI: 'SENTRI' };

function typicalKey(rule: RecurringRule): string {
  return `${rule.port_id}|${rule.lane_type || 'GENERAL'}|${rule.mode || 'VEHICULAR'}`;
}

/**
 * Descarga la semana típica de cada combinación garita/carril distinta (una
 * llamada por combinación, no por alarma ni por día). Lo que falle se omite:
 * esas alarmas simplemente salen sin el dato de la fila.
 */
export async function fetchTypicalWeeks(rules: RecurringRule[]): Promise<Map<string, TypicalWeek>> {
  const out = new Map<string, TypicalWeek>();
  const unique = new Map<string, RecurringRule>();
  for (const r of rules) if (r.active !== false) unique.set(typicalKey(r), r);
  await Promise.all(
    Array.from(unique.entries()).map(async ([key, r]) => {
      try {
        const d = await flowIndexApi.weekly(r.port_id, r.lane_type || 'GENERAL', r.mode || 'VEHICULAR');
        if (d && Array.isArray(d.week) && Array.isArray(d.byHour)) out.set(key, d);
      } catch {
        // sin dato típico para esta garita: la alarma usa el texto genérico
      }
    })
  );
  return out;
}

/** Minutos legibles: sin falsa precisión arriba de 10 (~19 → ~20). */
function redondear(m: number): number {
  return m < 10 ? m : Math.round(m / 5) * 5;
}

function textoFila(minutos: number): string {
  return minutos < 5 ? 'casi no hay fila' : `la fila suele ir en ~${redondear(minutos)} min`;
}

function bodyFor(
  rule: RecurringRule,
  hhmm: string,
  dow: number,
  hour: number,
  typical?: TypicalWeek
): { title: string; body: string } {
  const lane = LANE_LABEL[rule.lane_type || 'GENERAL'] || rule.lane_type || '';
  const peatonal = rule.mode === 'PEDESTRIAN' ? ' peatonal' : '';
  const donde = [rule.port_name, `${lane}${peatonal}`].filter(Boolean).join(' ');
  const lead = Number(rule.lead_minutes ?? 45) || 0;
  const faltan = lead > 0 ? `Faltan ${lead} min para tu cruce.` : 'Es la hora de tu cruce.';

  // Primero el dato de ese día de la semana; si hay pocas lecturas, el
  // promedio de todos los días a esa hora; si tampoco, el texto de antes.
  const celda = typical?.week?.[dow]?.[hour];
  const general = typical?.byHour?.[hour];
  let fila = '';
  if (celda && celda.n >= MIN_SAMPLES) {
    fila = `Los ${DIAS[dow]} a las ${hhmm} ${textoFila(celda.avg)}.`;
  } else if (general && general.n >= MIN_SAMPLES) {
    fila = `A las ${hhmm} ${textoFila(general.avg)}.`;
  }

  return {
    title: `⏰ Tu cruce de las ${hhmm}${donde ? ` · ${donde}` : ''}`,
    body: fila
      ? `${fila} ${faltan}`
      : `${faltan} Te avisamos con tiempo para que agarres buen momento.`,
  };
}

/** Cancela solo las alarmas que programó GaritaFlow, respetando otras notificaciones. */
export async function cancelLocalAlarms(recurringId?: string): Promise<number> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    let n = 0;
    for (const item of scheduled) {
      const data = (item.content?.data ?? {}) as Record<string, unknown>;
      if (data.tag !== TAG) continue;
      if (recurringId && data.recurringId !== recurringId) continue;
      await Notifications.cancelScheduledNotificationAsync(item.identifier);
      n++;
    }
    return n;
  } catch {
    return 0;
  }
}

// Las sincronizaciones se encadenan: si dos pantallas reprograman a la vez,
// una podría borrar mientras la otra programa y quedar alarmas duplicadas.
let cola: Promise<unknown> = Promise.resolve();

/**
 * Deja programadas exactamente las alarmas de `rules` (una por día activo).
 * Es idempotente: borra las anteriores y reprograma, así que se puede llamar
 * cada vez que la lista cambia sin acumular duplicados.
 *
 * Devuelve cuántas alarmas quedaron activas. Nunca lanza: si el permiso está
 * denegado o la API no existe (Expo Go), degrada a 0 en silencio.
 */
export function syncLocalAlarms(
  rules: RecurringRule[],
  typical?: Map<string, TypicalWeek>
): Promise<number> {
  const run = cola.then(() => syncNow(rules, typical));
  cola = run.catch(() => undefined);
  return run;
}

async function syncNow(rules: RecurringRule[], typical?: Map<string, TypicalWeek>): Promise<number> {
  try {
    const perm = await Notifications.getPermissionsAsync();
    await cancelLocalAlarms();
    if (perm.status !== 'granted') return 0;

    await ensureAlarmChannel();

    let scheduled = 0;
    for (const rule of rules) {
      if (rule.active === false) continue;
      const at = parseHHMM(rule.target_time);
      if (!at) continue;
      const days = Array.isArray(rule.days_of_week) ? rule.days_of_week : [];
      if (!days.length) continue;

      const lead = Number(rule.lead_minutes ?? 45) || 0;
      const semana = typical?.get(typicalKey(rule));

      for (const dow of days) {
        if (typeof dow !== 'number' || dow < 0 || dow > 6) continue;
        const fire = shiftBack(dow, at.h, at.m, lead);
        // El texto va por día: la fila de un lunes no es la de un domingo.
        const { title, body } = bodyFor(rule, rule.target_time!, dow, at.h, semana);
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              sound: 'default',
              data: { tag: TAG, recurringId: rule.id, portId: rule.port_id },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              // expo cuenta 1=Domingo .. 7=Sábado; nosotros 0=Domingo .. 6=Sábado
              weekday: fire.dow + 1,
              hour: fire.hour,
              minute: fire.minute,
              channelId: ALARM_CHANNEL_ID,
            },
          });
          scheduled++;
        } catch {
          // un día que falle no debe tumbar el resto
        }
      }
    }
    return scheduled;
  } catch {
    return 0;
  }
}

/**
 * Relee las alarmas del servidor y las reprograma con la espera típica al día.
 * Se llama al abrir la app. Si la lista no se puede leer (sin red) no toca
 * nada: las alarmas ya programadas en el teléfono siguen valiendo.
 */
export async function refreshLocalAlarms(): Promise<void> {
  let rules: RecurringRule[];
  try {
    rules = ((await recurringApi.list()) || []) as RecurringRule[];
  } catch {
    return;
  }
  const typical = await fetchTypicalWeeks(rules);
  await syncLocalAlarms(rules, typical);
}
