import { Modal, ScrollView, View } from 'react-native';

import {
  AddExpenseForm,
  type AddExpenseSubmitParams,
} from '@/components/AddExpenseForm';
import type { Group, GroupMember } from '@/types/group';

/** Modal wrapper — prefer navigating to /expense/add for the full Split It layout. */
export function AddExpenseModal({
  visible,
  onClose,
  onCreate,
  isCreating,
  members,
  currentUserId,
  group,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (params: AddExpenseSubmitParams) => void;
  isCreating: boolean;
  members: GroupMember[];
  currentUserId: string | undefined;
  group: Group;
  error?: string | null;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/40">
        <ScrollView
          className="max-h-[92%] rounded-t-3xl bg-background"
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-container-margin pb-10 pt-6">
            <AddExpenseForm
              groups={[group]}
              groupId={group.id}
              onGroupChange={() => {}}
              members={members}
              currentUserId={currentUserId}
              onSubmit={onCreate}
              onCancel={onClose}
              isSubmitting={isCreating}
              error={error}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
