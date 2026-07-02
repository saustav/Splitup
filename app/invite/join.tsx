import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TopAppBar } from '@/components/TopAppBar';
import { uiColors } from '@/constants/theme';
import { readClipboardText } from '@/lib/clipboardShare';
import { getErrorMessage } from '@/lib/errors';
import { acceptGroupInvite, normalizeInviteCode } from '@/lib/invites';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useGroupsStore } from '@/stores/groupsStore';

export default function JoinWithCodeScreen() {
  const router = useRouter();
  const fetchGroups = useGroupsStore((s) => s.fetchGroups);
  const [codeInput, setCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPasting, setIsPasting] = useState(false);

  const normalizedPreview = normalizeInviteCode(codeInput);

  async function handlePaste() {
    setIsPasting(true);
    setError(null);
    try {
      const text = await readClipboardText();
      const normalized = normalizeInviteCode(text);
      if (!normalized) {
        setError('Clipboard is empty or does not contain an invite code.');
        return;
      }
      setCodeInput(text.trim() ? text : normalized);
    } catch (e) {
      setError(getErrorMessage(e, 'Could not read clipboard'));
    } finally {
      setIsPasting(false);
    }
  }

  async function handleJoin() {
    const code = normalizeInviteCode(codeInput);
    if (!code) {
      setError('Enter an invite code or paste an invite link.');
      return;
    }

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

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 24,
            paddingBottom: 40,
            maxWidth: 480,
            width: '100%',
            alignSelf: 'center',
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-lg items-center">
            <View className="mb-md h-16 w-16 items-center justify-center rounded-full bg-primary-container">
              <MaterialIcons name="group-add" size={32} color="#00422b" />
            </View>
            <Text className="text-center font-sans-semibold text-headline-sm text-on-surface">
              Join with invite code
            </Text>
            <Text className="mt-sm text-center font-sans text-body-md text-on-surface-variant">
              Enter the code from your friend, or paste the full invite link.
            </Text>
          </View>

          <View className="gap-xs">
            <View className="flex-row items-center justify-between">
              <Text className="ml-1 font-sans-semibold text-label-md text-on-surface-variant">
                Invite code
              </Text>
              <Pressable
                onPress={() => void handlePaste()}
                disabled={isJoining || isPasting}
                className="flex-row items-center gap-xs rounded-md px-sm py-xs active:bg-surface-container-low disabled:opacity-50"
                style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
              >
                {isPasting ? (
                  <ActivityIndicator size="small" color={uiColors.iconOnLight} />
                ) : (
                  <MaterialIcons name="content-paste" size={18} color={uiColors.iconOnLight} />
                )}
                <Text className="font-sans-semibold text-label-md text-primary">
                  Paste
                </Text>
              </Pressable>
            </View>
            <View className="relative">
              <MaterialIcons
                name="vpn-key"
                size={20}
                color={uiColors.muted}
                style={{ position: 'absolute', left: 12, top: 14, zIndex: 1 }}
              />
              <TextInput
                value={codeInput}
                onChangeText={(text) => {
                  setCodeInput(text);
                  setError(null);
                }}
                placeholder="e.g. F4BBB812 or invite link"
                placeholderTextColor={uiColors.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isJoining}
                className="rounded-lg border border-outline-variant bg-background py-sm pl-10 pr-3 font-sans text-body-lg tracking-widest text-on-surface"
              />
            </View>
            {normalizedPreview && normalizedPreview !== codeInput.trim() ? (
              <Text className="ml-1 font-sans text-label-md text-on-surface-variant">
                Using code:{' '}
                <Text className="font-sans-semibold text-primary">
                  {normalizedPreview}
                </Text>
              </Text>
            ) : null}
          </View>

          {error ? (
            <Text className="mt-md text-center font-sans text-body-md text-error">
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={() => void handleJoin()}
            disabled={isJoining || !normalizedPreview}
            className="mt-lg flex-row items-center justify-center gap-sm rounded-xl bg-primary py-md active:opacity-90 disabled:opacity-50"
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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
