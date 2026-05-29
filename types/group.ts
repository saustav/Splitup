export type Group = {
  id: string;
  name: string;
  currency: string;
  created_by: string | null;
  created_at: string;
  member_count: number;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  profile?: {
    display_name: string | null;
  } | null;
};
