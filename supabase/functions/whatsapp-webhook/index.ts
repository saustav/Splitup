import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') ?? '';
const ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? '';
const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function normalizePhone(from: string): string {
  const digits = from.replace(/\D/g, '');
  return digits ? `+${digits}` : from;
}

async function sendWhatsAppText(to: string, text: string) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.error('WhatsApp send skipped: missing ACCESS_TOKEN or PHONE_NUMBER_ID');
    return;
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: 'text',
        text: { body: text.slice(0, 4096) },
      }),
    }
  );

  if (!res.ok) {
    console.error('WhatsApp send failed', await res.text());
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.json();
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;

    if (!messages?.length || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return jsonResponse({ ok: true });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    for (const message of messages) {
      if (message.type !== 'text' || !message.text?.body) continue;

      const from = normalizePhone(message.from ?? '');
      const body = String(message.text.body).trim();

      const { data: reply, error } = await supabase.rpc('whatsapp_handle_message', {
        p_phone_e164: from,
        p_body: body,
      });

      if (error) {
        console.error('whatsapp_handle_message', error);
        await sendWhatsAppText(
          from,
          'Something went wrong. Try again or use the Split It app.'
        );
        continue;
      }

      await sendWhatsAppText(from, String(reply ?? 'OK'));
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: 'webhook_failed' }, 500);
  }
});
