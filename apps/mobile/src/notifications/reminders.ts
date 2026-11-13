import * as Notifications from 'expo-notifications';
import type { Language } from '../domain/types';
import { translate } from '../i18n/translations';

const REMINDER_KIND = 'orbit.daily-planning';

export async function isDailyReminderEnabled(): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((item) => item.content.data?.kind === REMINDER_KIND);
}

export async function setDailyReminder(enabled: boolean, language: Language): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existing = scheduled.filter((item) => item.content.data?.kind === REMINDER_KIND);
  await Promise.all(existing.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));

  if (!enabled) return false;
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: translate(language, 'reminderNotificationTitle'),
      body: translate(language, 'reminderNotificationBody'),
      sound: 'default',
      data: { kind: REMINDER_KIND },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });
  return true;
}

