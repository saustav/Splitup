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

/** Another member added an expense in a shared group. */
export type ExpenseNotification = {
  kind: 'expense';
  eventId: string;
  expenseId: string;
  groupId: string;
  groupName: string;
  actorName: string;
  description: string;
  amount: number;
  currency: string;
  createdAt: string;
};

export type AppNotification = PaymentNotification | ExpenseNotification;

/** @deprecated Use PaymentNotification */
export type PendingPaymentAction = Omit<PaymentNotification, 'kind'> & {
  settlementId: string;
};
