import { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isSigningIn: boolean;
  initialize: () => Promise<void>;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
  setSigningIn: (value: boolean) => void;
}

let authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  isSigningIn: false,

  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ isLoading: false });
      return;
    }

    authSubscription?.unsubscribe();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    set({ session, user: session?.user ?? null, isLoading: false });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        isSigningIn: false,
      });
    });

    authSubscription = data.subscription;
  },

  refreshSession: async () => {
    if (!isSupabaseConfigured) {
      set({ session: null, user: null, isSigningIn: false });
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    set({
      session,
      user: session?.user ?? null,
      isSigningIn: false,
    });
  },

  setSigningIn: (value) => set({ isSigningIn: value }),

  signOut: async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    set({ session: null, user: null });
  },
}));
