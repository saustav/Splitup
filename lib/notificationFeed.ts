import {
  getEnabledActivityEventTypes,
  type NotificationPrefs,
} from '@/lib/notificationRules';
import { loadProfilePreferences } from '@/lib/profile';
import { getNotificationsLastSeen, markNotificationLogRead } from '@/lib/notificationSeen';
import { fetchIncomingPendingPaymentActions } from '@/lib/settlements';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  ActivityAppNotification,
  AppNotification,
  ExpenseCreatedNotification,
  ExpenseDeletedNotification,
  ExpenseUpdatedNotification,
  MemberJoinedNotification,
  MemberLeftNotification,
  MonthlyReportNotification,
  PaymentNotification,
  SettlementCompletedNotification,
} from '@/types/notification';

function actorLabel(
  actorId: string | null,
  userId: string,
  names: Record<string, string>
): string {
  if (!actorId) return 'Someone';
  if (actorId === userId) return 'You';
  return names[actorId]?.trim() || 'Someone';
}

type ActivityRow = {
  id: string;
  group_id: string;
  actor_id: string | null;
  entity_id: string | null;
  event_type: string;
  title: string;
  amount: number | null;
  currency: string | null;
  created_at: string;
  groups: { name: string } | { name: string }[] | null;
};

async function loadActorNames(
  actorIds: string[]
): Promise<Record<string, string>> {
  const profileNames: Record<string, string> = {};
  if (actorIds.length === 0) return profileNames;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', actorIds);

  for (const p of profiles ?? []) {
    profileNames[p.id] = p.display_name?.trim() || 'Someone';
  }
  return profileNames;
}

function mapActivityRow(
  row: ActivityRow,
  userId: string,
  profileNames: Record<string, string>
): ActivityAppNotification | null {
  const group = Array.isArray(row.groups) ? row.groups[0] : row.groups;
  const base = {
    eventId: row.id,
    groupId: row.group_id,
    groupName: group?.name ?? 'Group',
    actorName: actorLabel(row.actor_id, userId, profileNames),
    createdAt: row.created_at,
  };

  switch (row.event_type) {
    case 'expense_created':
      if (!row.entity_id) return null;
      return {
        kind: 'expense_created',
        ...base,
        expenseId: row.entity_id,
        description: row.title,
        amount: Number(row.amount ?? 0),
        currency: row.currency ?? 'USD',
      } satisfies ExpenseCreatedNotification;
    case 'expense_updated':
      if (!row.entity_id) return null;
      return {
        kind: 'expense_updated',
        ...base,
        expenseId: row.entity_id,
        description: row.title,
        amount: Number(row.amount ?? 0),
        currency: row.currency ?? 'USD',
      } satisfies ExpenseUpdatedNotification;
    case 'expense_deleted':
      if (!row.entity_id) return null;
      return {
        kind: 'expense_deleted',
        ...base,
        expenseId: row.entity_id,
        description: row.title,
        amount: Number(row.amount ?? 0),
        currency: row.currency ?? 'USD',
      } satisfies ExpenseDeletedNotification;
    case 'settlement_completed':
      if (!row.entity_id) return null;
      return {
        kind: 'settlement_completed',
        ...base,
        settlementId: row.entity_id,
        amount: Number(row.amount ?? 0),
        currency: row.currency ?? 'USD',
      } satisfies SettlementCompletedNotification;
    case 'member_joined':
      if (!row.entity_id) return null;
      return {
        kind: 'member_joined',
        ...base,
        memberId: row.entity_id,
      } satisfies MemberJoinedNotification;
    case 'member_left':
      if (!row.entity_id) return null;
      return {
        kind: 'member_left',
        ...base,
        memberId: row.entity_id,
      } satisfies MemberLeftNotification;
    default:
      return null;
  }
}

export async function fetchActivityNotifications(
  userId: string,
  eventTypes: string[],
  sinceIso: string
): Promise<ActivityAppNotification[]> {
  if (!isSupabaseConfigured || !userId || eventTypes.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('activity_events')
    .select(
      `
      id,
      group_id,
      actor_id,
      entity_id,
      event_type,
      title,
      amount,
      currency,
      created_at,
      groups ( name )
    `
    )
    .in('event_type', eventTypes)
    .gt('created_at', sinceIso)
    .neq('actor_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    if (error.code === '42P01' || error.message.includes('activity_events')) {
      return [];
    }
    throw error;
  }

  const rows = (data ?? []) as ActivityRow[];
  const actorIds = [
    ...new Set(rows.map((r) => r.actor_id).filter((id): id is string => Boolean(id))),
  ];
  const profileNames = await loadActorNames(actorIds);

  return rows
    .map((row) => mapActivityRow(row, userId, profileNames))
    .filter((n): n is ActivityAppNotification => n != null);
}

export async function fetchNotificationLogItems(
  userId: string,
  sinceIso: string
): Promise<MonthlyReportNotification[]> {
  if (!isSupabaseConfigured || !userId) {
    return [];
  }

  const { data, error } = await supabase
    .from('notification_log')
    .select('id, kind, title, body, data, created_at')
    .eq('user_id', userId)
    .eq('kind', 'monthly_report')
    .is('read_at', null)
    .gt('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    if (error.code === '42P01' || error.message.includes('notification_log')) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((row) => {
    const dataObj = (row.data ?? {}) as {
      totalYouOwe?: number;
      totalOwedToYou?: number;
    };
    return {
      kind: 'monthly_report' as const,
      logId: row.id,
      title: row.title,
      body: row.body,
      totalYouOwe: Number(dataObj.totalYouOwe ?? 0),
      totalOwedToYou: Number(dataObj.totalOwedToYou ?? 0),
      createdAt: row.created_at,
    };
  });
}

/** @deprecated Use fetchActivityNotifications */
export async function fetchExpenseNotifications(
  userId: string,
  sinceIso: string
): Promise<ExpenseCreatedNotification[]> {
  const items = await fetchActivityNotifications(
    userId,
    ['expense_created'],
    sinceIso
  );
  return items.filter((n): n is ExpenseCreatedNotification => n.kind === 'expense_created');
}

export async function fetchAppNotifications(
  userId: string
): Promise<AppNotification[]> {
  if (!isSupabaseConfigured || !userId) {
    return [];
  }

  const prefs = await loadProfilePreferences(userId);
  const sinceIso = await getNotificationsLastSeen(userId);
  const notificationPrefs: NotificationPrefs = prefs.notifications;

  const activityEventTypes = getEnabledActivityEventTypes(notificationPrefs);

  const [payments, activityItems, logItems] = await Promise.all([
    notificationPrefs.settlements
      ? fetchIncomingPendingPaymentActions(userId)
      : Promise.resolve([]),
    fetchActivityNotifications(userId, activityEventTypes, sinceIso),
    notificationPrefs.monthlyReports
      ? fetchNotificationLogItems(userId, sinceIso)
      : Promise.resolve([]),
  ]);

  const paymentItems: PaymentNotification[] = payments.map(
    ({ settlement, groupName, currency, payerName }) => ({
      kind: 'payment',
      settlementId: settlement.id,
      groupId: settlement.group_id,
      groupName,
      currency,
      payerId: settlement.payer_id,
      payerName,
      amount: settlement.amount,
      createdAt: settlement.created_at,
    })
  );

  const merged: AppNotification[] = [...paymentItems, ...activityItems, ...logItems];
  merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return merged;
}

export function buildNotificationCounts(items: AppNotification[]) {
  const countByGroupId: Record<string, number> = {};
  for (const item of items) {
    if ('groupId' in item && item.groupId) {
      countByGroupId[item.groupId] = (countByGroupId[item.groupId] ?? 0) + 1;
    }
  }
  return { countByGroupId, totalCount: items.length };
}

export { markNotificationLogRead };
