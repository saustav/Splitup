import { loadProfilePreferences } from '@/lib/profile';
import {
  getNotificationsLastSeen,
} from '@/lib/notificationSeen';
import { fetchIncomingPendingPaymentActions } from '@/lib/settlements';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { AppNotification, ExpenseNotification, PaymentNotification } from '@/types/notification';

function actorLabel(
  actorId: string | null,
  userId: string,
  names: Record<string, string>
): string {
  if (!actorId) return 'Someone';
  if (actorId === userId) return 'You';
  return names[actorId]?.trim() || 'Someone';
}

export async function fetchExpenseNotifications(
  userId: string,
  sinceIso: string
): Promise<ExpenseNotification[]> {
  if (!isSupabaseConfigured || !userId) {
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
      title,
      amount,
      currency,
      created_at,
      groups ( name )
    `
    )
    .eq('event_type', 'expense_created')
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

  const rows = data ?? [];
  const actorIds = [
    ...new Set(
      rows
        .map((r) => (r as { actor_id: string | null }).actor_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const profileNames: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', actorIds);

    for (const p of profiles ?? []) {
      profileNames[p.id] = p.display_name?.trim() || 'Someone';
    }
  }

  return rows
    .map((row) => {
      const r = row as {
        id: string;
        group_id: string;
        actor_id: string | null;
        entity_id: string | null;
        title: string;
        amount: number | null;
        currency: string | null;
        created_at: string;
        groups: { name: string } | { name: string }[] | null;
      };
      const group = Array.isArray(r.groups) ? r.groups[0] : r.groups;
      if (!r.entity_id) return null;

      return {
        kind: 'expense' as const,
        eventId: r.id,
        expenseId: r.entity_id,
        groupId: r.group_id,
        groupName: group?.name ?? 'Group',
        actorName: actorLabel(r.actor_id, userId, profileNames),
        description: r.title,
        amount: Number(r.amount ?? 0),
        currency: r.currency ?? 'USD',
        createdAt: r.created_at,
      };
    })
    .filter((n): n is ExpenseNotification => n != null);
}

export async function fetchAppNotifications(
  userId: string
): Promise<AppNotification[]> {
  if (!isSupabaseConfigured || !userId) {
    return [];
  }

  const prefs = await loadProfilePreferences(userId);
  const sinceIso = await getNotificationsLastSeen(userId);

  const [payments, expenses] = await Promise.all([
    fetchIncomingPendingPaymentActions(userId),
    prefs.notifications.expenseUpdates
      ? fetchExpenseNotifications(userId, sinceIso)
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

  const merged: AppNotification[] = [...paymentItems, ...expenses];
  merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return merged;
}

export function buildNotificationCounts(items: AppNotification[]) {
  const countByGroupId: Record<string, number> = {};
  for (const item of items) {
    countByGroupId[item.groupId] = (countByGroupId[item.groupId] ?? 0) + 1;
  }
  return { countByGroupId, totalCount: items.length };
}
