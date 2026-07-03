/** Incoming manual settlement the current user must confirm as payee. */
export type PaymentNotification = {
  kind: 'payment';
  settlementId: string;
  groupId: string;
  groupName: string;
  currency: string;
  payerId: string;
  payerName: string;
  amount: number;
  createdAt: string;
};

type ActivityNotificationBase = {
  eventId: string;
  groupId: string;
  groupName: string;
  actorName: string;
  createdAt: string;
};

/** Another member added an expense in a shared group. */
export type ExpenseCreatedNotification = ActivityNotificationBase & {
  kind: 'expense_created';
  expenseId: string;
  description: string;
  amount: number;
  currency: string;
};

/** Another member edited an expense in a shared group. */
export type ExpenseUpdatedNotification = ActivityNotificationBase & {
  kind: 'expense_updated';
  expenseId: string;
  description: string;
  amount: number;
  currency: string;
};

/** Another member deleted an expense in a shared group. */
export type ExpenseDeletedNotification = ActivityNotificationBase & {
  kind: 'expense_deleted';
  expenseId: string;
  description: string;
  amount: number;
  currency: string;
};

/** Payee confirmed a settlement — notifies the payer. */
export type SettlementCompletedNotification = ActivityNotificationBase & {
  kind: 'settlement_completed';
  settlementId: string;
  amount: number;
  currency: string;
};

/** A new member joined a shared group. */
export type MemberJoinedNotification = ActivityNotificationBase & {
  kind: 'member_joined';
  memberId: string;
};

/** A member left a shared group. */
export type MemberLeftNotification = ActivityNotificationBase & {
  kind: 'member_left';
  memberId: string;
};

/** Server-generated monthly balance summary. */
export type MonthlyReportNotification = {
  kind: 'monthly_report';
  logId: string;
  title: string;
  body: string;
  totalYouOwe: number;
  totalOwedToYou: number;
  createdAt: string;
};

export type ActivityAppNotification =
  | ExpenseCreatedNotification
  | ExpenseUpdatedNotification
  | ExpenseDeletedNotification
  | SettlementCompletedNotification
  | MemberJoinedNotification
  | MemberLeftNotification;

export type AppNotification =
  | PaymentNotification
  | ActivityAppNotification
  | MonthlyReportNotification;

/** @deprecated Use ExpenseCreatedNotification */
export type ExpenseNotification = ExpenseCreatedNotification;

/** @deprecated Use PaymentNotification */
export type PendingPaymentAction = Omit<PaymentNotification, 'kind'> & {
  settlementId: string;
};

export function notificationItemKey(item: AppNotification): string {
  switch (item.kind) {
    case 'payment':
      return `payment-${item.settlementId}`;
    case 'monthly_report':
      return `monthly-${item.logId}`;
    default:
      return `activity-${item.eventId}`;
  }
}
