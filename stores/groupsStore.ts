import { create } from 'zustand';

import { getErrorMessage } from '@/lib/errors';
import {
  createGroup as createGroupApi,
  deleteGroup as deleteGroupApi,
  fetchUserGroups,
  leaveGroup as leaveGroupApi,
  renameGroup as renameGroupApi,
} from '@/lib/groups';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Group } from '@/types/group';

interface GroupsState {
  groups: Group[];
  isLoading: boolean;
  isCreating: boolean;
  isDeleting: boolean;
  error: string | null;
  createGroupModalVisible: boolean;
  fetchGroups: () => Promise<void>;
  createGroup: (name: string, currency?: string) => Promise<Group | null>;
  /** Returns null on success, or an error message. */
  deleteGroup: (groupId: string) => Promise<string | null>;
  renameGroup: (groupId: string, name: string) => Promise<Group | null>;
  leaveGroup: (groupId: string) => Promise<string | null>;
  openCreateGroupModal: () => void;
  closeCreateGroupModal: () => void;
  clearError: () => void;
  subscribe: () => void;
  unsubscribe: () => void;
  reset: () => void;
}

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  isLoading: false,
  isCreating: false,
  isDeleting: false,
  error: null,
  createGroupModalVisible: false,

  openCreateGroupModal: () =>
    set({ createGroupModalVisible: true, error: null }),
  closeCreateGroupModal: () =>
    set({ createGroupModalVisible: false }),

  fetchGroups: async () => {
    if (!isSupabaseConfigured) {
      set({ groups: [], isLoading: false, error: null });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const groups = await fetchUserGroups();
      set({ groups, isLoading: false });
    } catch (e) {
      set({
        isLoading: false,
        error: getErrorMessage(e, 'Failed to load groups'),
      });
    }
  },

  clearError: () => set({ error: null }),

  createGroup: async (name: string, currency = 'USD') => {
    const trimmed = name.trim();
    if (!trimmed) {
      set({ error: 'Group name is required' });
      return null;
    }

    set({ isCreating: true, error: null });

    try {
      const group = await createGroupApi(trimmed, currency);
      set((state) => ({
        groups: [group, ...state.groups.filter((g) => g.id !== group.id)],
        isCreating: false,
        createGroupModalVisible: false,
      }));
      return group;
    } catch (e) {
      set({
        isCreating: false,
        error: getErrorMessage(e, 'Failed to create group'),
      });
      return null;
    }
  },

  renameGroup: async (groupId: string, name: string) => {
    set({ error: null });
    try {
      const group = await renameGroupApi(groupId, name);
      set((state) => ({
        groups: state.groups.map((g) => (g.id === groupId ? group : g)),
      }));
      return group;
    } catch (e) {
      set({ error: getErrorMessage(e, 'Failed to rename group') });
      return null;
    }
  },

  leaveGroup: async (groupId: string) => {
    set({ error: null });
    try {
      await leaveGroupApi(groupId);
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== groupId),
      }));
      return null;
    } catch (e) {
      return getErrorMessage(e, 'Failed to leave group');
    }
  },

  deleteGroup: async (groupId: string) => {
    set({ isDeleting: true, error: null });

    try {
      await deleteGroupApi(groupId);
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== groupId),
        isDeleting: false,
      }));
      return null;
    } catch (e) {
      const message = getErrorMessage(e, 'Failed to delete group');
      set({
        isDeleting: false,
        error: message,
      });
      return message;
    }
  },

  subscribe: () => {
    if (!isSupabaseConfigured) return;

    get().unsubscribe();

    realtimeChannel = supabase
      .channel('groups-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groups' },
        () => {
          get().fetchGroups();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members' },
        () => {
          get().fetchGroups();
        }
      )
      .subscribe();
  },

  unsubscribe: () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  },

  reset: () => {
    get().unsubscribe();
    set({
      groups: [],
      isLoading: false,
      isCreating: false,
      isDeleting: false,
      error: null,
      createGroupModalVisible: false,
    });
  },
}));
