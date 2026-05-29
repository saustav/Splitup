import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Group, GroupMember } from "@/types/group";

export async function fetchUserGroups(): Promise<Group[]> {
  if (!isSupabaseConfigured) return [];

  const { data: memberships, error: memberError } = await supabase
    .from("group_members")
    .select("group_id")
    .order("joined_at", { ascending: false });

  if (memberError) throw memberError;
  if (!memberships?.length) return [];

  const groupIds = memberships.map((m) => m.group_id);

  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select("id, name, currency, created_by, created_at")
    .in("id", groupIds)
    .order("created_at", { ascending: false });

  if (groupsError) throw groupsError;

  const { data: counts, error: countError } = await supabase
    .from("group_members")
    .select("group_id")
    .in("group_id", groupIds);

  if (countError) throw countError;

  const countByGroup = (counts ?? []).reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.group_id] = (acc[row.group_id] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return (groups ?? []).map((g) => ({
    ...g,
    currency: g.currency ?? "USD",
    member_count: countByGroup[g.id] ?? 0,
  }));
}

export async function createGroup(
  name: string,
  currency: string = "USD",
): Promise<Group> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await supabase.rpc("create_group", {
    group_name: name.trim(),
    p_currency: currency.toUpperCase(),
  });

  if (error) throw error;

  if (!data || typeof data !== "object" || !("id" in data)) {
    throw new Error(
      "Could not create group. Run supabase/schema.sql in your Supabase SQL Editor.",
    );
  }

  const row = data as Group;
  return {
    ...row,
    currency: row.currency ?? currency.toUpperCase(),
    member_count: 1,
  };
}

export async function fetchGroupMembers(
  groupId: string,
): Promise<GroupMember[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("group_members")
    .select(
      `
      id,
      group_id,
      user_id,
      role,
      joined_at,
      profile:profiles ( display_name )
    `,
    )
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const raw = row as GroupMember & {
      profile?:
        | { display_name: string | null }
        | { display_name: string | null }[];
    };
    const profile = Array.isArray(raw.profile)
      ? (raw.profile[0] ?? null)
      : (raw.profile ?? null);
    return { ...raw, profile };
  });
}

export async function fetchGroupById(groupId: string): Promise<Group | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from("groups")
    .select("id, name, currency, created_by, created_at")
    .eq("id", groupId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  const { count } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId);

  return {
    ...data,
    currency: data.currency ?? "USD",
    member_count: count ?? 0,
  };
}

/** True when the signed-in user created this group. */
export function isGroupCreator(
  group: Pick<Group, "created_by">,
  userId: string | undefined,
): boolean {
  return Boolean(userId && group.created_by === userId);
}

/** Creator or group owner role may delete the group (matches DB RLS). */
export function canDeleteGroup(
  group: Pick<Group, "created_by">,
  userId: string | undefined,
  members: { user_id: string; role: string }[],
): boolean {
  if (!userId) return false;
  if (isGroupCreator(group, userId)) return true;
  return members.some((m) => m.user_id === userId && m.role === "owner");
}

/** Deletes a group. Only the creator (owner) can delete — enforced by RLS. */
export async function deleteGroup(groupId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured");
  }

  const { error } = await supabase.from("groups").delete().eq("id", groupId);

  if (error) throw error;
}
