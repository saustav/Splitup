import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { chunkMessages, sendExpoPushMessages } from '../_shared/expoPush.ts';
import {
  isPrefEnabledForEventType,
  parseNotificationPrefs,
  pushCopyForEvent,
} from '../_shared/notificationRules.ts';

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE';
  table: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
};

type ActivityEvent = {
  id: string;
  group_id: string;
  actor_id: string | null;
  event_type: string;
  entity_id: string | null;
  title: string;
  amount: number | null;
  currency: string | null;
};

type Settlement = {
  id: string;
  group_id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  status: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing Supabase env' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const payload = (await req.json()) as WebhookPayload;
    const { table, record, type } = payload;

    if (table === 'activity_events' && type === 'INSERT') {
      await handleActivityEvent(supabase, record as unknown as ActivityEvent);
    } else if (table === 'settlements') {
      await handleSettlement(supabase, record as unknown as Settlement, type);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('send-notification error:', message);
    return jsonResponse({ error: message }, 500);
  }
});

async function handleActivityEvent(
  supabase: ReturnType<typeof createClient>,
  event: ActivityEvent
) {
  // Settlements are handled by the settlements table webhook to avoid duplicates.
  if (
    event.event_type === 'settlement_pending' ||
    event.event_type === 'settlement_completed'
  ) {
    return;
  }

  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', event.group_id);

  if (membersError) throw membersError;

  const recipientIds = (members ?? [])
    .map((m) => m.user_id as string)
    .filter((id) => id !== event.actor_id);

  if (recipientIds.length === 0) return;

  const { data: group } = await supabase
    .from('groups')
    .select('name')
    .eq('id', event.group_id)
    .maybeSingle();

  const groupName = (group?.name as string | undefined) ?? 'Group';

  let actorName = 'Someone';
  if (event.actor_id) {
    const { data: actor } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', event.actor_id)
      .maybeSingle();
    actorName = (actor?.display_name as string | undefined)?.trim() || 'Someone';
  }

  const copy = pushCopyForEvent(
    event.event_type,
    event.title,
    groupName,
    actorName,
    event.amount,
    event.currency
  );

  await sendToRecipients(supabase, recipientIds, event.event_type, copy.title, copy.body, {
    type: event.event_type,
    groupId: event.group_id,
    entityId: event.entity_id ?? '',
    eventId: event.id,
  });
}

async function handleSettlement(
  supabase: ReturnType<typeof createClient>,
  settlement: Settlement,
  changeType: 'INSERT' | 'UPDATE'
) {
  let recipientId: string | null = null;
  let eventType: string;

  if (changeType === 'INSERT' && settlement.status === 'pending') {
    recipientId = settlement.payee_id;
    eventType = 'settlement_pending';
  } else if (
    changeType === 'UPDATE' &&
    settlement.status === 'completed'
  ) {
    recipientId = settlement.payer_id;
    eventType = 'settlement_completed';
  } else {
    return;
  }

  if (!recipientId) return;

  const { data: group } = await supabase
    .from('groups')
    .select('name, currency')
    .eq('id', settlement.group_id)
    .maybeSingle();

  const groupName = (group?.name as string | undefined) ?? 'Group';
  const currency = (group?.currency as string | undefined) ?? 'USD';

  const { data: payer } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', settlement.payer_id)
    .maybeSingle();

  const payerName =
    (payer?.display_name as string | undefined)?.trim() || 'Someone';

  const copy = pushCopyForEvent(
    eventType,
    'Payment',
    groupName,
    payerName,
    settlement.amount,
    currency
  );

  await sendToRecipients(
    supabase,
    [recipientId],
    eventType,
    copy.title,
    copy.body,
    {
      type: eventType,
      groupId: settlement.group_id,
      entityId: settlement.id,
      settlementId: settlement.id,
    }
  );
}

async function sendToRecipients(
  supabase: ReturnType<typeof createClient>,
  recipientIds: string[],
  eventType: string,
  title: string,
  body: string,
  data: Record<string, string>
) {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, notification_prefs')
    .in('id', recipientIds);

  if (profilesError) throw profilesError;

  const allowedIds = (profiles ?? [])
    .filter((p) =>
      isPrefEnabledForEventType(
        parseNotificationPrefs(p.notification_prefs),
        eventType
      )
    )
    .map((p) => p.id as string);

  if (allowedIds.length === 0) return;

  const { data: tokens, error: tokensError } = await supabase
    .from('push_tokens')
    .select('token, user_id')
    .in('user_id', allowedIds);

  if (tokensError) throw tokensError;
  if (!tokens || tokens.length === 0) return;

  const messages = tokens.map((row) => ({
    to: row.token as string,
    title,
    body,
    data,
    sound: 'default' as const,
  }));

  for (const batch of chunkMessages(messages, 100)) {
    const tickets = await sendExpoPushMessages(batch);

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (
        ticket.status === 'error' &&
        ticket.details?.error === 'DeviceNotRegistered'
      ) {
        await supabase
          .from('push_tokens')
          .delete()
          .eq('token', batch[i].to);
      }
    }
  }
}
