export type PaymentProvider = 'manual';

export type SimplifiedDebt = {
  from_user_id: string;
  to_user_id: string;
  amount: number;
  from_name: string;
  to_name: string;
};

export type Settlement = {
  id: string;
  group_id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  provider: PaymentProvider;
  status: 'pending' | 'completed' | 'cancelled';
  external_ref: string | null;
  created_at: string;
};

export type EnrichedSettlement = Settlement & {
  payer_name: string;
  payee_name: string;
};
