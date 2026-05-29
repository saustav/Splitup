import type { GroupMember } from '@/types/group';

export function memberDisplayName(member: GroupMember): string {
  const profile = member.profile;
  const name = Array.isArray(profile)
    ? profile[0]?.display_name
    : profile?.display_name;

  if (name) return name;
  return `User ${member.user_id.slice(0, 8)}…`;
}
