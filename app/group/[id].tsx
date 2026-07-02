import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    Text,
    View,
} from "react-native";

import { BalanceSummary } from "@/components/BalanceSummary";
import { uiColors } from "@/constants/theme";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExpenseCard } from "@/components/ExpenseCard";
import { GroupDetailHeader } from "@/components/GroupDetailHeader";
import { GroupOptionsSheet } from "@/components/GroupOptionsSheet";
import { InviteFriendsModal } from "@/components/InviteFriendsModal";
import { RenameGroupModal } from "@/components/RenameGroupModal";
import {
  PendingSettlementsSection,
  useEnrichedPendingSettlements,
} from "@/components/PendingSettlementsSection";
import { TopAppBar } from "@/components/TopAppBar";
import { SETTLE_UP_ENABLED } from "@/constants/app";
import {
  canDeleteGroup,
  canLeaveGroup,
  canRenameGroup,
  fetchGroupById,
} from "@/lib/groups";
import { memberDisplayName } from "@/lib/members";
import { platformShadow } from "@/lib/platformShadow";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useExpensesStore } from "@/stores/expensesStore";
import { useGroupsStore } from "@/stores/groupsStore";
import { usePendingActionsStore } from "@/stores/pendingActionsStore";
import type { Group } from "@/types/group";

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="mb-stack-gap flex-row items-center justify-between px-1">
      <Text className="font-sans-semibold text-headline-sm text-on-surface">
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction}>
          <Text className="font-sans-semibold text-label-md text-primary">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ExpensesSectionHeader({
  sortAscending,
  onToggleSort,
  isLoading,
}: {
  sortAscending: boolean;
  onToggleSort: () => void;
  isLoading: boolean;
}) {
  return (
    <View className="mb-stack-gap flex-row items-center justify-between px-1">
      <Text className="font-sans-semibold text-headline-sm text-on-surface">
        Expenses
      </Text>
      <Pressable
        onPress={onToggleSort}
        disabled={isLoading}
        className="flex-row items-center gap-xs rounded-full border border-outline-variant px-sm py-xs active:bg-surface-container"
        accessibilityLabel={
          sortAscending ? "Sort expenses oldest first" : "Sort expenses newest first"
        }
      >
        <MaterialIcons name="sort" size={16} color={uiColors.iconOnLight} />
        <Text className="font-sans-semibold text-label-md text-primary">
          {sortAscending ? "Oldest" : "Newest"}
        </Text>
      </Pressable>
    </View>
  );
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const deleteGroup = useGroupsStore((s) => s.deleteGroup);
  const renameGroup = useGroupsStore((s) => s.renameGroup);
  const leaveGroup = useGroupsStore((s) => s.leaveGroup);
  const fetchGroups = useGroupsStore((s) => s.fetchGroups);
  const [group, setGroup] = useState<Group | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [leaveConfirmVisible, setLeaveConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const expenses = useExpensesStore((s) => s.expenses);
  const expenseCount = useExpensesStore((s) => s.expenseCount);
  const expenseSortAscending = useExpensesStore((s) => s.expenseSortAscending);
  const hasMoreExpenses = useExpensesStore((s) => s.hasMoreExpenses);
  const isLoadingMore = useExpensesStore((s) => s.isLoadingMore);
  const members = useExpensesStore((s) => s.members);
  const balances = useExpensesStore((s) => s.balances);
  const pendingSettlements = useExpensesStore((s) => s.pendingSettlements);
  const refreshPendingActions = usePendingActionsStore((s) => s.refresh);
  const groupPendingCount = usePendingActionsStore((s) =>
    id ? (s.countByGroupId[id] ?? 0) : 0
  );
  const openNotifications = usePendingActionsStore((s) => s.openSheet);

  const canDelete = group
    ? canDeleteGroup(group, user?.id, members)
    : false;
  const canRename = group
    ? canRenameGroup(group, user?.id, members)
    : false;
  const canLeave = canLeaveGroup(user?.id, members);
  const isLoading = useExpensesStore((s) => s.isLoading);
  const error = useExpensesStore((s) => s.error);
  const loadForGroup = useExpensesStore((s) => s.loadForGroup);
  const loadMoreExpenses = useExpensesStore((s) => s.loadMoreExpenses);
  const toggleExpenseSort = useExpensesStore((s) => s.toggleExpenseSort);
  const subscribe = useExpensesStore((s) => s.subscribe);
  const unsubscribe = useExpensesStore((s) => s.unsubscribe);
  const reset = useExpensesStore((s) => s.reset);

  const yourBalance = useMemo(() => {
    if (!user?.id) return 0;
    return balances.find((b) => b.user_id === user.id)?.net_balance ?? 0;
  }, [balances, user?.id]);

  const memberNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of members) {
      map[m.user_id] = memberDisplayName(m);
    }
    return map;
  }, [members]);

  const enrichedPending = useEnrichedPendingSettlements(
    pendingSettlements,
    balances,
  );

  const loadGroupMeta = useCallback(async () => {
    if (!id || !isSupabaseConfigured) return null;
    return fetchGroupById(id);
  }, [id]);

  const loadAll = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!id || !isSupabaseConfigured) return;

      if (!options?.silent) {
        setPageLoading(true);
      }
      setPageError(null);

      try {
        const groupData = await loadGroupMeta();
        if (!groupData) {
          setPageError("Group not found");
          setGroup(null);
        } else {
          setGroup(groupData);
          await loadForGroup(id);
        }
      } catch (e) {
        setPageError(e instanceof Error ? e.message : "Failed to load group");
      } finally {
        setPageLoading(false);
      }
    },
    [id, loadGroupMeta, loadForGroup],
  );

  useEffect(() => {
    if (!id) return;

    subscribe(id);

    return () => {
      unsubscribe();
      reset();
    };
  }, [id, subscribe, unsubscribe, reset]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void loadAll({ silent: true });
      void refreshPendingActions();
    }, [id, loadAll, refreshPendingActions]),
  );

  async function performDeleteGroup() {
    if (!id || !group || !canDelete) return;

    setIsDeleting(true);
    setPageError(null);
    const deleteError = await deleteGroup(id);
    setIsDeleting(false);
    setDeleteConfirmVisible(false);

    if (!deleteError) {
      await fetchGroups();
      router.replace("/(tabs)");
    } else {
      setPageError(deleteError);
    }
  }

  async function performLeaveGroup() {
    if (!id || !canLeave) return;

    setIsLeaving(true);
    setPageError(null);
    const leaveError = await leaveGroup(id);
    setIsLeaving(false);
    setLeaveConfirmVisible(false);

    if (!leaveError) {
      await fetchGroups();
      router.replace("/(tabs)");
    } else {
      setPageError(leaveError);
    }
  }

  async function handleRenameGroup(name: string) {
    if (!id || !canRename) return;

    setIsRenaming(true);
    setRenameError(null);
    const updated = await renameGroup(id, name);
    setIsRenaming(false);

    if (updated) {
      setGroup(updated);
    } else {
      setRenameError(useGroupsStore.getState().error ?? "Failed to rename group");
    }
  }

  function goAddExpense() {
    router.push(`/expense/add?groupId=${id}`);
  }

  if (pageLoading && !group) {
    return (
      <View className="flex-1 bg-background">
        <TopAppBar title="Group" showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={uiColors.iconOnLight} />
        </View>
      </View>
    );
  }

  if (pageError || !group) {
    return (
      <View className="flex-1 bg-background">
        <TopAppBar title="Group" showBack />
        <View className="flex-1 items-center justify-center px-container-margin">
          <MaterialIcons name="error-outline" size={40} color="#ba1a1a" />
          <Text className="mt-md text-center font-sans text-body-md text-error">
            {pageError ?? "Group not found"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <TopAppBar
        title={group.name}
        showBack
        showNotifications={groupPendingCount > 0}
        notificationCount={groupPendingCount}
        onNotificationsPress={openNotifications}
        onInvitePress={() => setInviteVisible(true)}
        onMenuPress={() => setMenuVisible(true)}
      />

      <FlatList
        className="flex-1"
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExpenseCard
            expense={item}
            currentUserId={user?.id}
            memberNameById={memberNameById}
          />
        )}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 120,
          maxWidth: 900,
          width: "100%",
          alignSelf: "center",
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && !pageLoading}
            onRefresh={() => loadAll({ silent: true })}
            tintColor={uiColors.iconOnLight}
          />
        }
        onEndReached={() => void loadMoreExpenses()}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={
          <View className="gap-section-gap pb-section-gap">
            <GroupDetailHeader
              group={group}
              members={members}
              yourBalance={yourBalance}
              expenseCount={expenseCount}
            />

            {SETTLE_UP_ENABLED ? (
              <Pressable
                onPress={() => router.push(`/group/${id}/settle`)}
                className="flex-row items-center justify-center gap-xs rounded-xl bg-primary py-md active:opacity-90"
                style={platformShadow("card")}
              >
                <MaterialIcons name="payments" size={20} color="#ffffff" />
                <Text className="font-sans-semibold text-body-md text-on-primary">
                  Settle up
                </Text>
              </Pressable>
            ) : null}

            {SETTLE_UP_ENABLED && enrichedPending.length > 0 ? (
              <View>
                <SectionHeader title="Settlements" />
                <PendingSettlementsSection
                  settlements={enrichedPending}
                  currentUserId={user?.id}
                  currencyCode={group.currency}
                  onUpdated={async () => {
                    await loadForGroup(id!);
                    await refreshPendingActions();
                  }}
                />
              </View>
            ) : null}

            <View>
              <SectionHeader title="Balances" />
              <BalanceSummary balances={balances} currencyCode={group.currency} />
            </View>

            <View>
              <ExpensesSectionHeader
                sortAscending={expenseSortAscending}
                onToggleSort={() => void toggleExpenseSort()}
                isLoading={isLoading && expenses.length === 0}
              />
              {isLoading && expenses.length === 0 ? (
                <View className="items-center py-12">
                  <ActivityIndicator size="large" color={uiColors.iconOnLight} />
                </View>
              ) : expenseCount === 0 ? (
                <View className="items-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-lg py-lg">
                  <View className="mb-sm h-14 w-14 items-center justify-center rounded-full bg-surface-container">
                    <MaterialIcons
                      name="receipt-long"
                      size={28}
                      color={uiColors.iconOnLight}
                    />
                  </View>
                  <Text className="text-center font-sans-semibold text-body-lg text-on-surface">
                    No expenses yet
                  </Text>
                  <Text className="mt-xs text-center font-sans text-body-md text-on-surface-variant">
                    Log a shared bill so everyone can see who paid and who owes.
                  </Text>
                  <Pressable
                    onPress={goAddExpense}
                    className="mt-md flex-row items-center gap-xs rounded-full bg-primary px-md py-sm active:opacity-90"
                  >
                    <MaterialIcons name="add" size={20} color="#ffffff" />
                    <Text className="font-sans-semibold text-body-md text-on-primary">
                      Add expense
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {(error || pageError) && (
              <View className="rounded-xl bg-error-container p-md">
                <Text className="text-center font-sans text-body-md text-on-error-container">
                  {error ?? pageError}
                </Text>
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View className="items-center py-md">
              <ActivityIndicator size="small" color={uiColors.iconOnLight} />
            </View>
          ) : hasMoreExpenses && expenses.length > 0 ? (
            <Text className="py-sm text-center font-sans text-label-md text-on-surface-variant">
              Scroll for more expenses
            </Text>
          ) : null
        }
      />

      {expenseCount > 0 ? (
        <Pressable
          onPress={goAddExpense}
          accessibilityLabel="Add expense"
          className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary active:opacity-90"
          style={platformShadow("fab")}
        >
          <MaterialIcons name="add" size={32} color="#ffffff" />
        </Pressable>
      ) : null}

      <InviteFriendsModal
        visible={inviteVisible}
        onClose={() => setInviteVisible(false)}
        groupId={group.id}
        groupName={group.name}
      />

      <GroupOptionsSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        canRename={canRename}
        canDelete={canDelete}
        canLeave={canLeave}
        onRename={() => {
          setRenameError(null);
          setRenameVisible(true);
        }}
        onLeave={() => setLeaveConfirmVisible(true)}
        onDelete={() => setDeleteConfirmVisible(true)}
      />

      <RenameGroupModal
        visible={renameVisible}
        initialName={group.name}
        onClose={() => !isRenaming && setRenameVisible(false)}
        onSave={handleRenameGroup}
        isSaving={isRenaming}
        error={renameError}
      />

      <ConfirmDialog
        visible={leaveConfirmVisible}
        title="Leave group?"
        message={`You will no longer see "${group.name}" or its expenses. You can rejoin with an invite code.`}
        confirmLabel="Leave"
        destructive
        isLoading={isLeaving}
        onCancel={() => !isLeaving && setLeaveConfirmVisible(false)}
        onConfirm={performLeaveGroup}
      />

      <ConfirmDialog
        visible={deleteConfirmVisible}
        title="Delete group?"
        message={`“${group.name}” and all its expenses will be permanently removed for every member.`}
        confirmLabel="Delete"
        destructive
        isLoading={isDeleting}
        onCancel={() => !isDeleting && setDeleteConfirmVisible(false)}
        onConfirm={performDeleteGroup}
      />
    </View>
  );
}
