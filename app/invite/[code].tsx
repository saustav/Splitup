import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';

import { TopAppBar } from '@/components/TopAppBar';
import { getErrorMessage } from '@/lib/errors';
import { acceptGroupInvite, normalizeInviteCode } from '@/lib/invites';
import { paramString } from '@/lib/routeParams';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useGroupsStore } from '@/stores/groupsStore';

export default function AcceptInviteScreen() {
  const params = useLocalSearchParams<{ code: string | string[] }>();
  const rawCode = paramString(params.code);
  const code = useMemo(
    () => (rawCode ? normalizeInviteCode(rawCode) : ''),
    [rawCode]
  );
  const router = useRouter();
  const fetchGroups = useGroupsStore((s) => s.fetchGroups);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (!code) return;

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const groupId = await acceptGroupInvite(code);
      await fetchGroups();
      router.replace(`/group/${groupId}`);
    } catch (e) {
      setError(getErrorMessage(e, 'Could not join group'));
      setIsJoining(false);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <TopAppBar title="Join group" showBack />
      <View className="flex-1 items-center justify-center px-container-margin">
        <View className="mb-lg h-16 w-16 items-center justify-center rounded-full bg-primary-container">
          <MaterialIcons name="group-add" size={32} color="#00422b" />
        </View>
        <Text className="text-center font-sans-semibold text-headline-sm text-on-surface">
          You&apos;re invited
        </Text>
        <Text className="mt-sm text-center font-sans text-body-md text-on-surface-variant">
          Join this group with invite code
        </Text>
        <Text className="mt-md font-sans-bold text-display-lg-mobile tracking-widest text-primary">
          {code || '—'}
        </Text>

        {error ? (
          <Text className="mt-md text-center font-sans text-body-md text-error">
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={() => void handleJoin()}
          disabled={isJoining || !code}
          className="mt-lg w-full max-w-xs flex-row items-center justify-center gap-sm rounded-xl bg-primary py-md active:opacity-90 disabled:opacity-50"
        >
          {isJoining ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <MaterialIcons name="login" size={22} color="#ffffff" />
              <Text className="font-sans-semibold text-body-lg text-on-primary">
                Join group
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.replace('/invite/join')}
          className="mt-md py-sm active:opacity-80"
        >
          <Text className="font-sans-semibold text-label-md text-primary">
            Enter a different code
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
