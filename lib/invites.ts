import * as Linking from 'expo-linking';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { GroupInvite } from '@/types/invite';

export function buildInviteUrl(code: string): string {
  return Linking.createURL(`invite/${code}`);
}

/** Trim input; accept raw codes or pasted invite URLs. */
export function normalizeInviteCode(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const fromPath = trimmed.match(/\/invite\/([A-Za-z0-9-]+)/i);
  if (fromPath?.[1]) {
    return fromPath[1].replace(/-/g, '').toUpperCase();
  }

  return trimmed.replace(/\s+/g, '').toUpperCase();
}

export async function createGroupInvite(groupId: string): Promise<GroupInvite> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await supabase.rpc('create_group_invite', {
    p_group_id: groupId,
  });

  if (error) throw error;

  const code = data as string;
  return { code, inviteUrl: buildInviteUrl(code) };
}

export async function acceptGroupInvite(code: string): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await supabase.rpc('accept_group_invite', {
    p_code: code.trim(),
  });

  if (error) throw error;
  return data as string;
}
