import { normalizePhoneE164 } from '@/lib/whatsapp/phone';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type WhatsAppLinkStatus = {
  linked: boolean;
  verified: boolean;
  phone: string | null;
  default_group_id: string | null;
  pending_code: boolean;
};

export async function fetchWhatsAppStatus(): Promise<WhatsAppLinkStatus | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase.rpc('whatsapp_get_status');
  if (error) throw error;
  return data as WhatsAppLinkStatus;
}

export async function requestWhatsAppLinkCode(
  phone: string
): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const normalized = normalizePhoneE164(phone);
  if (!normalized) {
    throw new Error('Enter a valid phone number with country code (e.g. +97798…)');
  }

  const { data, error } = await supabase.rpc('whatsapp_request_link', {
    p_phone_e164: normalized,
  });

  if (error) throw error;
  return data as string;
}

export async function setWhatsAppDefaultGroup(groupId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase.rpc('whatsapp_set_default_group', {
    p_group_id: groupId,
  });

  if (error) throw error;
}

export async function unlinkWhatsApp(): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase.rpc('whatsapp_unlink');
  if (error) throw error;
}
