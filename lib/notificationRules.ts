export type NotificationPrefs = {
  expenseUpdates: boolean;
  settlements: boolean;
  groupActivity: boolean;
  monthlyReports: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  expenseUpdates: true,
  settlements: true,
  groupActivity: true,
  monthlyReports: false,
};

/** Maps activity_events.event_type to the user preference that gates it. */
export const EVENT_PREF_MAP: Record<string, keyof NotificationPrefs> = {
  expense_created: 'expenseUpdates',
  expense_updated: 'expenseUpdates',
  expense_deleted: 'expenseUpdates',
  settlement_pending: 'settlements',
  settlement_completed: 'settlements',
  member_joined: 'groupActivity',
  member_left: 'groupActivity',
};

/** Activity event types fetched for the in-app feed (excludes settlement_pending — handled via settlements table). */
export const IN_APP_ACTIVITY_EVENT_TYPES = [
  'expense_created',
  'expense_updated',
  'expense_deleted',
  'settlement_completed',
  'member_joined',
  'member_left',
] as const;

export type InAppActivityEventType = (typeof IN_APP_ACTIVITY_EVENT_TYPES)[number];

export function getEnabledActivityEventTypes(
  prefs: NotificationPrefs
): InAppActivityEventType[] {
  return IN_APP_ACTIVITY_EVENT_TYPES.filter((eventType) => {
    const prefKey = EVENT_PREF_MAP[eventType];
    return prefKey ? prefs[prefKey] : false;
  });
}

export function isPrefEnabledForEventType(
  prefs: NotificationPrefs,
  eventType: string
): boolean {
  const prefKey = EVENT_PREF_MAP[eventType];
  if (!prefKey) return false;
  return prefs[prefKey];
}

export function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
  const obj = raw as Partial<NotificationPrefs>;
  return {
    expenseUpdates: obj.expenseUpdates ?? DEFAULT_NOTIFICATION_PREFS.expenseUpdates,
    settlements: obj.settlements ?? DEFAULT_NOTIFICATION_PREFS.settlements,
    groupActivity: obj.groupActivity ?? DEFAULT_NOTIFICATION_PREFS.groupActivity,
    monthlyReports: obj.monthlyReports ?? DEFAULT_NOTIFICATION_PREFS.monthlyReports,
  };
}
