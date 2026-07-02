import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';

import { APP_NAME } from '@/constants/app';
import { uiColors } from '@/constants/theme';
import { copyText, shareContent } from '@/lib/clipboardShare';
import { getErrorMessage } from '@/lib/errors';
import { createGroupInvite } from '@/lib/invites';

export function InviteFriendsModal({
  visible,
  onClose,
  groupId,
  groupName,
}: {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'link' | 'code' | null>(null);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showCopiedFeedback(field: 'link' | 'code') {
    setCopiedField(field);
    if (copyResetTimer.current) {
      clearTimeout(copyResetTimer.current);
    }
    copyResetTimer.current = setTimeout(() => {
      setCopiedField(null);
      copyResetTimer.current = null;
    }, 2000);
  }

  function resetState() {
    if (copyResetTimer.current) {
      clearTimeout(copyResetTimer.current);
      copyResetTimer.current = null;
    }
    setCode(null);
    setInviteUrl(null);
    setError(null);
    setIsLoading(false);
    setCopiedField(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  const loadInvite = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const invite = await createGroupInvite(groupId);
      setCode(invite.code);
      setInviteUrl(invite.inviteUrl);
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to create invite'));
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (visible) {
      void loadInvite();
    } else {
      resetState();
    }
  }, [visible, loadInvite]);

  async function ensureInvite(): Promise<{ code: string; inviteUrl: string }> {
    if (code && inviteUrl) {
      return { code, inviteUrl };
    }
    const invite = await createGroupInvite(groupId);
    setCode(invite.code);
    setInviteUrl(invite.inviteUrl);
    return invite;
  }

  async function handleShare() {
    try {
      const invite = await ensureInvite();
      await shareContent({
        title: `Invite to ${groupName}`,
        message: `Join "${groupName}" on ${APP_NAME}!\n\nCode: ${invite.code}\nLink: ${invite.inviteUrl}`,
        url: invite.inviteUrl,
      });
    } catch (e) {
      Alert.alert('Could not share', getErrorMessage(e, 'Sharing failed'));
    }
  }

  async function handleCopyLink() {
    try {
      const invite = await ensureInvite();
      await copyText(invite.inviteUrl);
      showCopiedFeedback('link');
    } catch (e) {
      Alert.alert('Could not copy', getErrorMessage(e, 'Copy failed'));
    }
  }

  async function handleCopyCode() {
    try {
      const invite = await ensureInvite();
      await copyText(invite.code);
      showCopiedFeedback('code');
    } catch (e) {
      Alert.alert('Could not copy', getErrorMessage(e, 'Copy failed'));
    }
  }

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) {
        clearTimeout(copyResetTimer.current);
      }
    };
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/40"
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss invite dialog"
        />
        <View className="z-10 rounded-t-3xl bg-white px-6 pb-10 pt-6 dark:bg-neutral-900">
          <Text className="text-xl font-bold text-neutral-900 dark:text-white">
            Invite friends
          </Text>
          <Text className="mt-1 text-sm text-neutral-500">
            Share a link or code. Expires in 7 days.
          </Text>

          {isLoading && !code ? (
            <View className="mt-6 items-center py-8">
              <ActivityIndicator size="large" color={uiColors.iconOnLight} />
            </View>
          ) : code && inviteUrl ? (
            <Pressable
              onPress={() => void handleCopyCode()}
              disabled={isLoading || copiedField === 'code'}
              accessibilityRole="button"
              accessibilityLabel={
                copiedField === 'code' ? 'Invite code copied' : 'Copy invite code'
              }
              className={`mt-6 rounded-2xl border p-4 active:opacity-90 ${
                copiedField === 'code'
                  ? 'border-primary bg-secondary-container'
                  : 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800'
              }`}
              style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-neutral-500">Invite code</Text>
                <View className="flex-row items-center gap-xs">
                  <MaterialIcons
                    name={copiedField === 'code' ? 'check-circle' : 'content-copy'}
                    size={16}
                    color={copiedField === 'code' ? uiColors.iconOnLight : uiColors.muted}
                  />
                  <Text
                    className={`text-xs font-semibold ${
                      copiedField === 'code' ? 'text-primary' : 'text-neutral-500'
                    }`}
                  >
                    {copiedField === 'code' ? 'Copied!' : 'Tap to copy'}
                  </Text>
                </View>
              </View>
              <Text className="mt-1 text-2xl font-bold tracking-widest text-brand-dark">
                {code}
              </Text>
              <Text className="mt-3 text-xs text-neutral-500" numberOfLines={2}>
                {inviteUrl}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void loadInvite()}
              disabled={isLoading}
              className="mt-6 rounded-xl bg-brand-600 py-3 active:bg-brand-700 disabled:opacity-50"
            >
              <Text className="text-center font-semibold text-white">
                Try again
              </Text>
            </Pressable>
          )}

          {error ? (
            <Text className="mt-3 text-center text-sm text-red-600 dark:text-red-400">
              {error}
            </Text>
          ) : null}

          {code && inviteUrl ? (
            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={() => void handleCopyLink()}
                disabled={isLoading || copiedField === 'link'}
                accessibilityRole="button"
                accessibilityLabel={
                  copiedField === 'link' ? 'Invite link copied' : 'Copy invite link'
                }
                className={`flex-1 flex-row items-center justify-center gap-xs rounded-xl border py-md active:opacity-80 ${
                  copiedField === 'link'
                    ? 'border-primary bg-secondary-container'
                    : 'border-neutral-200 dark:border-neutral-700'
                }`}
                style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
              >
                <MaterialIcons
                  name={copiedField === 'link' ? 'check-circle' : 'link'}
                  size={18}
                  color={copiedField === 'link' ? uiColors.iconOnLight : uiColors.muted}
                />
                <Text
                  className={`text-center font-semibold ${
                    copiedField === 'link'
                      ? 'text-primary'
                      : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {copiedField === 'link' ? 'Copied!' : 'Copy link'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void handleShare()}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Share invite"
                className="flex-1 rounded-xl bg-brand-600 py-3 active:bg-brand-700 disabled:opacity-50"
                style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
              >
                <Text className="text-center font-semibold text-white">Share</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
