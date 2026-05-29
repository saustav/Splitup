import { Tabs, useRouter } from 'expo-router';
import { useState } from 'react';

import { AddActionSheet } from '@/components/AddActionSheet';
import { CreateGroupModal } from '@/components/CreateGroupModal';
import { CustomTabBar } from '@/components/CustomTabBar';
import { useGroupsStore } from '@/stores/groupsStore';

export default function TabLayout() {
  const router = useRouter();
  const [addSheetVisible, setAddSheetVisible] = useState(false);

  const createGroupModalVisible = useGroupsStore((s) => s.createGroupModalVisible);
  const openCreateGroupModal = useGroupsStore((s) => s.openCreateGroupModal);
  const closeCreateGroupModal = useGroupsStore((s) => s.closeCreateGroupModal);
  const createGroup = useGroupsStore((s) => s.createGroup);
  const isCreating = useGroupsStore((s) => s.isCreating);
  const createError = useGroupsStore((s) => s.error);
  const clearError = useGroupsStore((s) => s.clearError);

  async function handleCreateGroup(name: string, currency: string) {
    const group = await createGroup(name, currency);
    if (group) {
      router.push(`/group/${group.id}`);
    }
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
        tabBar={(props) => (
          <CustomTabBar
            state={props.state}
            descriptors={props.descriptors}
            navigation={
              props.navigation as {
                emit: (event: {
                  type: string;
                  target: string;
                  canPreventDefault?: boolean;
                }) => { defaultPrevented: boolean };
                navigate: (name: string) => void;
              }
            }
            onAddPress={() => setAddSheetVisible(true)}
          />
        )}
      >
        <Tabs.Screen name="index" options={{ title: 'Groups' }} />
        <Tabs.Screen name="balances" options={{ title: 'Balances' }} />
        <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
        <Tabs.Screen name="account" options={{ title: 'Account' }} />
        <Tabs.Screen
          name="groups"
          options={{
            title: 'All Groups',
            href: null,
          }}
        />
      </Tabs>

      <AddActionSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
        onAddExpense={() => router.push('/expense/add')}
        onAddGroup={() => openCreateGroupModal()}
        onJoinWithCode={() => router.push('/invite/join')}
      />

      <CreateGroupModal
        visible={createGroupModalVisible}
        onClose={() => {
          clearError();
          closeCreateGroupModal();
        }}
        onCreate={handleCreateGroup}
        isCreating={isCreating}
        error={createError}
      />
    </>
  );
}
