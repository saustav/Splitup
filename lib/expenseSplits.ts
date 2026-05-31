import { initialsFromLabel } from '@/lib/groupDisplay';
import type { ExpenseSplit } from '@/types/expense';

export type SplitParticipant = {
  userId: string;
  /** Full display name from profile (never the word "You"). */
  rawName: string;
  firstName: string;
  initials: string;
  amountOwed: number;
  isYou: boolean;
};

export function getIncludedSplits(
  splits: ExpenseSplit[] | undefined,
  threshold = 0.01
): ExpenseSplit[] {
  return (splits ?? []).filter((s) => Number(s.amount_owed) > threshold);
}

/** Profile or member-list name — used for initials (first + last name letters). */
export function resolveMemberRawName(
  userId: string,
  split?: Pick<ExpenseSplit, 'profile'>,
  nameByUserId?: Record<string, string>
): string {
  const fromProfile = split?.profile?.display_name?.trim();
  if (fromProfile) return fromProfile;
  const fromMap = nameByUserId?.[userId]?.trim();
  if (fromMap) return fromMap;
  return 'Member';
}

export function firstNameFromRawName(rawName: string): string {
  const parts = rawName.trim().split(/\s+/).filter(Boolean);
  return parts[0] ?? rawName;
}

/** Label in the name list under avatars ("you" or first name). */
export function participantShortLabel(
  participant: SplitParticipant
): string {
  return participant.isYou ? 'you' : participant.firstName;
}

export function buildSplitParticipants(
  splits: ExpenseSplit[] | undefined,
  currentUserId: string | undefined,
  nameByUserId?: Record<string, string>
): SplitParticipant[] {
  const included = getIncludedSplits(splits);

  const participants = included.map((split) => {
    const rawName = resolveMemberRawName(
      split.user_id,
      split,
      nameByUserId
    );
    const isYou = Boolean(currentUserId && split.user_id === currentUserId);

    return {
      userId: split.user_id,
      rawName,
      firstName: firstNameFromRawName(rawName),
      initials: initialsFromLabel(rawName),
      amountOwed: Number(split.amount_owed),
      isYou,
    };
  });

  // Show other members first, then you — easier to see who the expense is split with.
  return participants.sort((a, b) => {
    if (a.isYou === b.isYou) return 0;
    return a.isYou ? 1 : -1;
  });
}

/** e.g. "Rajesh" or "you and Rajesh" */
export function formatSplitWithLabel(
  participants: SplitParticipant[],
  maxNames = 3
): string {
  if (participants.length === 0) return '';

  const names = participants.map((p) => participantShortLabel(p));
  const shown = names.slice(0, maxNames);
  const rest = names.length - shown.length;

  let list: string;
  if (shown.length === 1) {
    list = shown[0];
  } else if (shown.length === 2) {
    list = `${shown[0]} and ${shown[1]}`;
  } else {
    list = `${shown.slice(0, -1).join(', ')}, and ${shown[shown.length - 1]}`;
  }

  if (rest > 0) {
    return `${list} +${rest} more`;
  }
  return list;
}
