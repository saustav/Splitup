import { formatMoney } from '@/lib/currency';
import { fetchUserGroups } from '@/lib/groups';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type ActivityFilter = 'all' | 'expenses' | 'payments' | 'groups';

export type ActivityType =
  | 'expense'
  | 'expense_updated'
  | 'expense_deleted'
  | 'payment'
  | 'group_join'
  | 'settlement'
  | 'invite';

export type ActivityItem = {
  id: string;
  type: ActivityType;
  createdAt: string;
  groupId: string;
  groupName: string;
  currency: string;
  amount?: number;
  actorName: string;
  description: string;
  message: string;
  dimmed?: boolean;
};

type ActivityEventRow = {
  id: string;
  group_id: string;
  actor_id: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  title: string;
  amount: number | null;
  currency: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  groups?: { name: string } | { name: string }[];
};

const expenseSelect = `
  id,
  group_id,
  description,
  category,
  amount,
  currency,
  paid_by,
  created_at,
  payer:profiles!expenses_paid_by_profile_fkey ( display_name ),
  groups ( name )
`;

function payerName(
  paidBy: string,
  currentUserId: string,
  profile?: { display_name: string | null } | null
): string {
  if (paidBy === currentUserId) return 'You';
  const name = profile?.display_name?.trim();
  if (name) return shortName(name);
  return 'Someone';
}

function shortName(full: string): string {
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1][0]}.`;
  }
  return parts[0] ?? full;
}

function profileName(
  userId: string,
  currentUserId: string,
  profile?: { display_name: string | null } | null
): string {
  if (userId === currentUserId) return 'You';
  const name = profile?.display_name?.trim();
  if (name) return shortName(name);
  return 'Someone';
}

async function loadProfileNames(
  userIds: string[]
): Promise<Record<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return {};

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', unique);

  const map: Record<string, string> = {};
  for (const p of profiles ?? []) {
    map[p.id] = p.display_name?.trim() || '';
  }
  return map;
}

function actorFromProfiles(
  actorId: string | null,
  userId: string,
  profileNames: Record<string, string>
): string {
  if (!actorId) return 'Someone';
  if (actorId === userId) return 'You';
  const name = profileNames[actorId];
  if (name) return shortName(name);
  return 'Someone';
}

function mapActivityEvent(
  row: ActivityEventRow,
  userId: string,
  groupNameById: Record<string, string>,
  currencyByGroup: Record<string, string>,
  profileNames: Record<string, string>
): ActivityItem | null {
  const group = Array.isArray(row.groups) ? row.groups[0] : row.groups;
  const groupName = group?.name ?? groupNameById[row.group_id] ?? 'Group';
  const currency =
    row.currency ?? currencyByGroup[row.group_id] ?? 'USD';
  const actor = actorFromProfiles(row.actor_id, userId, profileNames);
  const meta = row.metadata ?? {};

  switch (row.event_type) {
    case 'expense_created':
      return {
        id: `event-${row.id}`,
        type: 'expense',
        createdAt: row.created_at,
        groupId: row.group_id,
        groupName,
        currency,
        amount: row.amount != null ? Number(row.amount) : undefined,
        actorName: actor,
        description: row.title,
        message: `${actor} added "${row.title}" in ${groupName}`,
      };
    case 'expense_updated':
      return {
        id: `event-${row.id}`,
        type: 'expense_updated',
        createdAt: row.created_at,
        groupId: row.group_id,
        groupName,
        currency,
        amount: row.amount != null ? Number(row.amount) : undefined,
        actorName: actor,
        description: row.title,
        message: `${actor} updated "${row.title}" in ${groupName}`,
      };
    case 'expense_deleted':
      return {
        id: `event-${row.id}`,
        type: 'expense_deleted',
        createdAt: row.created_at,
        groupId: row.group_id,
        groupName,
        currency,
        amount: row.amount != null ? Number(row.amount) : undefined,
        actorName: actor,
        description: row.title,
        message: `${actor} removed "${row.title}" from ${groupName}`,
        dimmed: true,
      };
    case 'invite_created': {
      const code =
        (meta.invite_code as string | undefined) ?? row.title;
      return {
        id: `event-${row.id}`,
        type: 'invite',
        createdAt: row.created_at,
        groupId: row.group_id,
        groupName,
        currency,
        actorName: actor,
        description: code,
        message: `${actor} shared invite code ${code} for ${groupName}`,
      };
    }
    case 'member_joined': {
      const joinerId = row.entity_id ?? row.actor_id;
      const joiner = joinerId
        ? actorFromProfiles(joinerId, userId, profileNames)
        : actor;
      const isSelf = joinerId === userId;
      return {
        id: `event-${row.id}`,
        type: 'group_join',
        createdAt: row.created_at,
        groupId: row.group_id,
        groupName,
        currency,
        actorName: isSelf ? 'You' : joiner,
        description: groupName,
        message: isSelf
          ? `You joined ${groupName}`
          : `${joiner} joined ${groupName}`,
      };
    }
    case 'settlement_completed': {
      const payerId = meta.payer_id as string | undefined;
      const payeeId = meta.payee_id as string | undefined;
      const amount = row.amount != null ? Number(row.amount) : 0;
      const amountStr = formatMoney(amount, currency);
      const when = row.created_at;

      if (payeeId === userId && payerId) {
        const who = profileName(payerId, userId, {
          display_name: profileNames[payerId] ?? null,
        });
        return {
          id: `event-${row.id}`,
          type: 'payment',
          createdAt: when,
          groupId: row.group_id,
          groupName,
          currency,
          amount,
          actorName: who,
          description: amountStr,
          message: `${who} paid you ${amountStr}`,
        };
      }
      if (payerId === userId && payeeId) {
        const who = profileName(payeeId, userId, {
          display_name: profileNames[payeeId] ?? null,
        });
        return {
          id: `event-${row.id}`,
          type: 'settlement',
          createdAt: when,
          groupId: row.group_id,
          groupName,
          currency,
          amount,
          actorName: 'You',
          description: amountStr,
          message: `You settled up with ${who}`,
          dimmed: true,
        };
      }
      return null;
    }
    default:
      return null;
  }
}

async function fetchActivityEvents(
  groupIds: string[],
  userId: string,
  groupNameById: Record<string, string>,
  currencyByGroup: Record<string, string>
): Promise<{
  items: ActivityItem[];
  expenseIdsWithEvents: Set<string>;
  settlementIdsWithEvents: Set<string>;
  memberJoinKeys: Set<string>;
}> {
  const expenseIdsWithEvents = new Set<string>();
  const settlementIdsWithEvents = new Set<string>();
  const memberJoinKeys = new Set<string>();

  const { data, error } = await supabase
    .from('activity_events')
    .select(
      'id, group_id, actor_id, event_type, entity_type, entity_id, title, amount, currency, metadata, created_at, groups ( name )'
    )
    .in('group_id', groupIds)
    .order('created_at', { ascending: false })
    .limit(120);

  if (error) {
    if (error.code === '42P01' || error.message.includes('activity_events')) {
      return {
        items: [],
        expenseIdsWithEvents,
        settlementIdsWithEvents,
        memberJoinKeys,
      };
    }
    throw error;
  }

  const rows = (data ?? []) as ActivityEventRow[];
  const profileIds: string[] = [];
  for (const row of rows) {
    if (row.actor_id) profileIds.push(row.actor_id);
    if (row.entity_id && row.event_type === 'member_joined') {
      profileIds.push(row.entity_id);
    }
    const meta = row.metadata ?? {};
    if (typeof meta.payer_id === 'string') profileIds.push(meta.payer_id);
    if (typeof meta.payee_id === 'string') profileIds.push(meta.payee_id);
  }
  const profileNames = await loadProfileNames(profileIds);

  const items: ActivityItem[] = [];
  for (const row of rows) {
    if (row.entity_id) {
      if (
        row.event_type === 'expense_created' ||
        row.event_type === 'expense_updated' ||
        row.event_type === 'expense_deleted'
      ) {
        expenseIdsWithEvents.add(row.entity_id);
      }
      if (row.event_type === 'settlement_completed') {
        settlementIdsWithEvents.add(row.entity_id);
      }
      if (row.event_type === 'member_joined') {
        memberJoinKeys.add(`${row.group_id}:${row.entity_id}`);
      }
    }

    const item = mapActivityEvent(
      row,
      userId,
      groupNameById,
      currencyByGroup,
      profileNames
    );
    if (item) items.push(item);
  }

  return {
    items,
    expenseIdsWithEvents,
    settlementIdsWithEvents,
    memberJoinKeys,
  };
}

async function fetchLegacyActivity(
  userId: string,
  groupIds: string[],
  groupNameById: Record<string, string>,
  currencyByGroup: Record<string, string>,
  skip: {
    expenseIds: Set<string>;
    settlementIds: Set<string>;
    memberJoinKeys: Set<string>;
  }
): Promise<ActivityItem[]> {
  const [expensesRes, settlementsRes, joinsRes] = await Promise.all([
    supabase
      .from('expenses')
      .select(expenseSelect)
      .in('group_id', groupIds)
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('settlements')
      .select(
        'id, group_id, payer_id, payee_id, amount, status, created_at, completed_at'
      )
      .in('group_id', groupIds)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(40),
    supabase
      .from('group_members')
      .select('id, group_id, user_id, joined_at, groups ( name )')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })
      .limit(20),
  ]);

  if (expensesRes.error) throw expensesRes.error;

  const items: ActivityItem[] = [];

  for (const row of expensesRes.data ?? []) {
    const raw = row as {
      id: string;
      group_id: string;
      description: string;
      amount: number;
      currency: string;
      paid_by: string;
      created_at: string;
      payer?: { display_name: string | null } | { display_name: string | null }[];
      groups?: { name: string } | { name: string }[];
    };
    if (skip.expenseIds.has(raw.id)) continue;

    const payer = Array.isArray(raw.payer) ? raw.payer[0] : raw.payer;
    const group = Array.isArray(raw.groups) ? raw.groups[0] : raw.groups;
    const groupName = group?.name ?? groupNameById[raw.group_id] ?? 'Group';
    const who = payerName(raw.paid_by, userId, payer);

    items.push({
      id: `expense-${raw.id}`,
      type: 'expense',
      createdAt: raw.created_at,
      groupId: raw.group_id,
      groupName,
      currency: raw.currency ?? currencyByGroup[raw.group_id] ?? 'USD',
      amount: Number(raw.amount),
      actorName: who,
      description: raw.description,
      message: `${who} added "${raw.description}" in ${groupName}`,
    });
  }

  const profileNames = await loadProfileNames(
    (settlementsRes.data ?? []).flatMap((r) => [r.payer_id, r.payee_id])
  );

  if (!settlementsRes.error) {
    for (const row of settlementsRes.data ?? []) {
      if (skip.settlementIds.has(row.id)) continue;

      const groupName = groupNameById[row.group_id] ?? 'Group';
      const currency = currencyByGroup[row.group_id] ?? 'USD';
      const when = row.completed_at ?? row.created_at;
      const amountStr = formatMoney(Number(row.amount), currency);

      if (row.payee_id === userId) {
        const who = profileName(row.payer_id, userId, {
          display_name: profileNames[row.payer_id] ?? null,
        });
        items.push({
          id: `settlement-${row.id}`,
          type: 'payment',
          createdAt: when,
          groupId: row.group_id,
          groupName,
          currency,
          amount: Number(row.amount),
          actorName: who,
          description: amountStr,
          message: `${who} paid you ${amountStr}`,
        });
      } else if (row.payer_id === userId) {
        const who = profileName(row.payee_id, userId, {
          display_name: profileNames[row.payee_id] ?? null,
        });
        items.push({
          id: `settlement-out-${row.id}`,
          type: 'settlement',
          createdAt: when,
          groupId: row.group_id,
          groupName,
          currency,
          amount: Number(row.amount),
          actorName: 'You',
          description: amountStr,
          message: `You settled up with ${who}`,
          dimmed: true,
        });
      }
    }
  }

  if (!joinsRes.error) {
    for (const row of joinsRes.data ?? []) {
      const raw = row as {
        id: string;
        group_id: string;
        user_id: string;
        joined_at: string;
        groups?: { name: string } | { name: string }[];
      };
      if (skip.memberJoinKeys.has(`${raw.group_id}:${raw.user_id}`)) {
        continue;
      }

      const group = Array.isArray(raw.groups) ? raw.groups[0] : raw.groups;
      const groupName = group?.name ?? groupNameById[raw.group_id] ?? 'Group';
      const joined = new Date(raw.joined_at).getTime();
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (joined < weekAgo) continue;

      items.push({
        id: `join-${raw.id}`,
        type: 'group_join',
        createdAt: raw.joined_at,
        groupId: raw.group_id,
        groupName,
        currency: currencyByGroup[raw.group_id] ?? 'USD',
        actorName: 'You',
        description: groupName,
        message: `You joined ${groupName}`,
      });
    }
  }

  return items;
}

export async function fetchUserActivity(
  userId: string
): Promise<ActivityItem[]> {
  if (!isSupabaseConfigured || !userId) return [];

  const groups = await fetchUserGroups();
  if (!groups.length) return [];

  const groupIds = groups.map((g) => g.id);
  const groupNameById = Object.fromEntries(groups.map((g) => [g.id, g.name]));
  const currencyByGroup = Object.fromEntries(
    groups.map((g) => [g.id, g.currency ?? 'USD'])
  );

  const {
    items: eventItems,
    expenseIdsWithEvents,
    settlementIdsWithEvents,
    memberJoinKeys,
  } = await fetchActivityEvents(
    groupIds,
    userId,
    groupNameById,
    currencyByGroup
  );

  const legacyItems = await fetchLegacyActivity(
    userId,
    groupIds,
    groupNameById,
    currencyByGroup,
    {
      expenseIds: expenseIdsWithEvents,
      settlementIds: settlementIdsWithEvents,
      memberJoinKeys,
    }
  );

  const merged = [...eventItems, ...legacyItems];
  return merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

const EXPENSE_TYPES: ActivityType[] = [
  'expense',
  'expense_updated',
  'expense_deleted',
];

export function filterActivities(
  items: ActivityItem[],
  filter: ActivityFilter
): ActivityItem[] {
  if (filter === 'all') return items;
  if (filter === 'expenses') {
    return items.filter((i) => EXPENSE_TYPES.includes(i.type));
  }
  if (filter === 'payments') {
    return items.filter((i) => i.type === 'payment' || i.type === 'settlement');
  }
  if (filter === 'groups') {
    return items.filter((i) => i.type === 'group_join' || i.type === 'invite');
  }
  return items;
}

export function searchActivities(
  items: ActivityItem[],
  query: string
): ActivityItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (i) =>
      i.message.toLowerCase().includes(q) ||
      i.groupName.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q)
  );
}

export type ActivityDayGroup = {
  label: string;
  items: ActivityItem[];
};

export function groupActivitiesByDay(items: ActivityItem[]): ActivityDayGroup[] {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  const buckets = new Map<string, ActivityItem[]>();

  for (const item of items) {
    const t = new Date(item.createdAt).getTime();
    let label: string;
    if (t >= startOfToday) {
      label = 'TODAY';
    } else if (t >= startOfYesterday) {
      label = 'YESTERDAY';
    } else {
      label = new Date(item.createdAt)
        .toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        .toUpperCase();
    }
    const list = buckets.get(label) ?? [];
    list.push(item);
    buckets.set(label, list);
  }

  const order = ['TODAY', 'YESTERDAY'];
  const groups: ActivityDayGroup[] = [];

  for (const key of order) {
    if (buckets.has(key)) {
      groups.push({ label: key, items: buckets.get(key)! });
      buckets.delete(key);
    }
  }

  for (const [label, dayItems] of buckets) {
    groups.push({ label, items: dayItems });
  }

  return groups;
}

export function formatActivityTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const t = date.getTime();

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (t >= startOfToday && diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
  if (t >= startOfYesterday && t < startOfToday) {
    return `Yesterday at ${date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function activityFilterCounts(items: ActivityItem[]): Record<
  ActivityFilter,
  number
> {
  return {
    all: items.length,
    expenses: items.filter((i) => EXPENSE_TYPES.includes(i.type)).length,
    payments: items.filter(
      (i) => i.type === 'payment' || i.type === 'settlement'
    ).length,
    groups: items.filter(
      (i) => i.type === 'group_join' || i.type === 'invite'
    ).length,
  };
}
