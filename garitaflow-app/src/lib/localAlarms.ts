import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

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

function bodyFor(rule: RecurringRule, hhmm: string): { title: string; body: string } {
  const where = rule.port_name ? ` por ${rule.port_name}` : '';
  const lead = rule.lead_minutes ?? 45;
  return {
    title: '⏰ Hora de salir',
    body: `Tu cruce${where} es a las ${hhmm}. Te avisamos ${lead} min antes para que agarres buen momento.`,
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

/**
 * Deja programadas exactamente las alarmas de `rules` (una por día activo).
 * Es idempotente: borra las anteriores y reprograma, así que se puede llamar
 * cada vez que la lista cambia sin acumular duplicados.
 *
 * Devuelve cuántas alarmas quedaron activas. Nunca lanza: si el permiso está
 * denegado o la API no existe (Expo Go), degrada a 0 en silencio.
 */
export async function syncLocalAlarms(rules: RecurringRule[]): Promise<number> {
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
      const { title, body } = bodyFor(rule, rule.target_time!);

      for (const dow of days) {
        if (typeof dow !== 'number' || dow < 0 || dow > 6) continue;
        const fire = shiftBack(dow, at.h, at.m, lead);
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
