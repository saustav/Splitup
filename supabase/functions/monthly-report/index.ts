import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { chunkMessages, sendExpoPushMessages } from '../_shared/expoPush.ts';
import { parseNotificationPrefs } from '../_shared/notificationRules.ts';

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

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
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

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, notification_prefs');

    if (profilesError) throw profilesError;

    let sent = 0;

    for (const profile of profiles ?? []) {
      const prefs = parseNotificationPrefs(profile.notification_prefs);
      if (!prefs.monthlyReports) continue;

      const userId = profile.id as string;

      const { data: balanceRows, error: balanceError } = await supabase.rpc(
        'get_user_net_balance',
        { p_user_id: userId }
      );

      if (balanceError) {
        console.error(`Balance error for ${userId}:`, balanceError.message);
        continue;
      }

      const balance = balanceRows?.[0] as
        | {
            total_you_owe: number;
            total_owed_to_you: number;
            net_balance: number;
          }
        | undefined;

      if (!balance) continue;

      const youOwe = Number(balance.total_you_owe ?? 0);
      const owedToYou = Number(balance.total_owed_to_you ?? 0);

      if (youOwe <= 0 && owedToYou <= 0) continue;

      let title = 'Monthly balance summary';
      let body: string;

      if (youOwe > 0 && owedToYou > 0) {
        body = `You owe ${formatMoney(youOwe, 'USD')} total and are owed ${formatMoney(owedToYou, 'USD')}. Open Splitup for details.`;
      } else if (youOwe > 0) {
        body = `You owe ${formatMoney(youOwe, 'USD')} across your groups this month.`;
      } else {
        body = `You are owed ${formatMoney(owedToYou, 'USD')} across your groups this month.`;
      }

      const { data: logRow, error: logError } = await supabase
        .from('notification_log')
        .insert({
          user_id: userId,
          kind: 'monthly_report',
          title,
          body,
          data: {
            totalYouOwe: youOwe,
            totalOwedToYou: owedToYou,
            netBalance: Number(balance.net_balance ?? 0),
          },
        })
        .select('id')
        .single();

      if (logError) {
        console.error(`Log error for ${userId}:`, logError.message);
        continue;
      }

      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId);

      if (tokens && tokens.length > 0) {
        const messages = tokens.map((row) => ({
          to: row.token as string,
          title,
          body,
          data: {
            type: 'monthly_report',
            logId: logRow.id as string,
          },
          sound: 'default' as const,
        }));

        for (const batch of chunkMessages(messages, 100)) {
          await sendExpoPushMessages(batch);
        }
      }

      sent += 1;
    }

    return jsonResponse({ ok: true, sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('monthly-report error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
