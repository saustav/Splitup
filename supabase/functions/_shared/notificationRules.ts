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

export const EVENT_PREF_MAP: Record<string, keyof NotificationPrefs> = {
  expense_created: 'expenseUpdates',
  expense_updated: 'expenseUpdates',
  expense_deleted: 'expenseUpdates',
  settlement_pending: 'settlements',
  settlement_completed: 'settlements',
  member_joined: 'groupActivity',
  member_left: 'groupActivity',
};

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

export function isPrefEnabledForEventType(
  prefs: NotificationPrefs,
  eventType: string
): boolean {
  const prefKey = EVENT_PREF_MAP[eventType];
  if (!prefKey) return false;
  return prefs[prefKey];
}

export function pushCopyForEvent(
  eventType: string,
  title: string,
  groupName: string,
  actorName: string,
  amount?: number | null,
  currency?: string | null
): { title: string; body: string } {
  const money =
    amount != null && currency
      ? `${currency} ${Number(amount).toFixed(2)}`
      : null;

  switch (eventType) {
    case 'expense_created':
      return {
        title: 'New expense',
        body: `${actorName} added "${title}"${money ? ` (${money})` : ''} in ${groupName}`,
      };
    case 'expense_updated':
      return {
        title: 'Expense updated',
        body: `${actorName} edited "${title}" in ${groupName}`,
      };
    case 'expense_deleted':
      return {
        title: 'Expense removed',
        body: `${actorName} removed "${title}" from ${groupName}`,
      };
    case 'settlement_pending':
      return {
        title: 'Confirm payment',
        body: `${actorName} recorded a payment${money ? ` of ${money}` : ''} in ${groupName}`,
      };
    case 'settlement_completed':
      return {
        title: 'Payment confirmed',
        body: `${actorName} confirmed your payment${money ? ` of ${money}` : ''} in ${groupName}`,
      };
    case 'member_joined':
      return {
        title: 'New member',
        body: `${actorName} joined ${groupName}`,
      };
    case 'member_left':
      return {
        title: 'Member left',
        body: `${actorName} left ${groupName}`,
      };
    default:
      return { title: 'Splitup update', body: title || groupName };
  }
}
