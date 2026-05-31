export type WhatsAppParsedMessage =
  | { type: 'link'; code: string }
  | { type: 'help' }
  | { type: 'groups' }
  | { type: 'set_group'; groupName: string }
  | { type: 'expense'; amount: number; description: string; groupName?: string }
  | { type: 'unknown' };

const LINK_RE = /^link\s+(\d{6})$/i;
const GROUP_RE = /^group\s+(.+)$/i;
const EXPENSE_WITH_GROUP_RE =
  /^(\d+(?:\.\d{1,2})?)\s+(.+?)\s+in\s+(.+)$/i;
const EXPENSE_RE = /^(\d+(?:\.\d{1,2})?)\s+(.+)$/i;
const ADD_EXPENSE_RE = /^add\s+(\d+(?:\.\d{1,2})?)\s+(.+)$/i;

/**
 * Parse inbound WhatsApp text into a command or expense.
 *
 * Examples:
 * - `LINK 482910` — verify phone
 * - `50 dinner` — add expense (default group)
 * - `add 120 taxi in Tokyo trip` — expense in named group
 * - `GROUP Roommates` — set default group
 * - `HELP` / `GROUPS`
 */
export function parseWhatsAppMessage(body: string): WhatsAppParsedMessage {
  const text = body.trim();
  if (!text) return { type: 'unknown' };

  const upper = text.toUpperCase();
  if (upper === 'HELP' || upper === '?') return { type: 'help' };
  if (upper === 'GROUPS') return { type: 'groups' };

  const linkMatch = text.match(LINK_RE);
  if (linkMatch) return { type: 'link', code: linkMatch[1] };

  const groupMatch = text.match(GROUP_RE);
  if (groupMatch) {
    return { type: 'set_group', groupName: groupMatch[1].trim() };
  }

  const withGroup = text.match(EXPENSE_WITH_GROUP_RE);
  if (withGroup) {
    const amount = Number(withGroup[1]);
    if (amount > 0) {
      return {
        type: 'expense',
        amount,
        description: withGroup[2].trim(),
        groupName: withGroup[3].trim(),
      };
    }
  }

  const addMatch = text.match(ADD_EXPENSE_RE);
  if (addMatch) {
    const amount = Number(addMatch[1]);
    if (amount > 0) {
      return {
        type: 'expense',
        amount,
        description: addMatch[2].trim(),
      };
    }
  }

  const expenseMatch = text.match(EXPENSE_RE);
  if (expenseMatch) {
    const amount = Number(expenseMatch[1]);
    if (amount > 0) {
      return {
        type: 'expense',
        amount,
        description: expenseMatch[2].trim(),
      };
    }
  }

  return { type: 'unknown' };
}

export const WHATSAPP_HELP_TEXT = `Split It on WhatsApp

• LINK 123456 — connect your number (code from the app)
• 50 dinner — add expense to your default group
• 50 lunch in Roommates — add to a specific group
• GROUP Roommates — set default group
• GROUPS — list your groups
• HELP — this message`;
