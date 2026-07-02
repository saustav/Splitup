import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { WHATSAPP_BOT_ENABLED } from '@/constants/app';
import { fetchUserGroups } from '@/lib/groups';
import { platformShadow } from '@/lib/platformShadow';
import { WHATSAPP_HELP_TEXT } from '@/lib/whatsapp/parseMessage';
import { normalizePhoneE164 } from '@/lib/whatsapp/phone';
import {
  fetchWhatsAppStatus,
  requestWhatsAppLinkCode,
  setWhatsAppDefaultGroup,
  unlinkWhatsApp,
  type WhatsAppLinkStatus,
} from '@/lib/whatsapp/client';
import type { Group } from '@/types/group';

type WhatsAppBotCardProps = {
  phone: string;
  onPhoneChange: (phone: string) => void;
};

export function WhatsAppBotCard({ phone, onPhoneChange }: WhatsAppBotCardProps) {
  const [status, setStatus] = useState<WhatsAppLinkStatus | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [linkStatus, userGroups] = await Promise.all([
        fetchWhatsAppStatus(),
        fetchUserGroups(),
      ]);
      setStatus(linkStatus);
      setGroups(userGroups);
    } catch {
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRequestLink() {
    const normalized = normalizePhoneE164(phone);
    if (!normalized) {
      Alert.alert(
        'Phone required',
        'Add your number with country code (e.g. +9779812345678) above, then try again.'
      );
      return;
    }

    onPhoneChange(normalized);
    setIsWorking(true);
    try {
      const code = await requestWhatsAppLinkCode(normalized);
      setLinkCode(code);
      await load();
    } catch (e) {
      Alert.alert(
        'Could not start linking',
        e instanceof Error ? e.message : 'Something went wrong'
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function handleSetDefaultGroup(groupId: string) {
    setIsWorking(true);
    try {
      await setWhatsAppDefaultGroup(groupId);
      await load();
      const name = groups.find((g) => g.id === groupId)?.name ?? 'group';
      Alert.alert('Default group set', `WhatsApp expenses will go to "${name}" by default.`);
    } catch (e) {
      Alert.alert(
        'Could not set group',
        e instanceof Error ? e.message : 'Link WhatsApp first.'
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function handleUnlink() {
    setIsWorking(true);
    try {
      await unlinkWhatsApp();
      setLinkCode(null);
      await load();
    } catch (e) {
      Alert.alert(
        'Could not unlink',
        e instanceof Error ? e.message : 'Something went wrong'
      );
    } finally {
      setIsWorking(false);
    }
  }

  if (!WHATSAPP_BOT_ENABLED) {
    return (
      <View
        className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-md opacity-80"
        style={platformShadow('card')}
      >
        <View className="flex-row items-center gap-sm">
          <MaterialIcons name="chat" size={22} color="#25D366" />
          <Text className="font-sans-semibold text-body-lg text-on-surface">
            WhatsApp bot
          </Text>
        </View>
        <Text className="mt-sm font-sans text-body-md text-on-surface-variant">
          Add expenses by sending a WhatsApp message — no need to open the app.
          Coming soon.
        </Text>
      </View>
    );
  }

  return (
    <View
      className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md"
      style={platformShadow('card')}
    >
      <View className="flex-row items-center gap-sm">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-[#25D366]/15">
          <MaterialIcons name="chat" size={22} color="#25D366" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-sans-semibold text-body-lg text-on-surface">
            WhatsApp bot
          </Text>
          <Text className="font-sans text-label-md text-on-surface-variant">
            Add expenses by message — no need to open the app
          </Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-md" color="#0F6E56" />
      ) : (
        <View className="mt-md gap-sm">
          {status?.verified ? (
            <View className="rounded-lg bg-primary/10 px-sm py-xs">
              <Text className="font-sans-semibold text-label-md text-primary">
                Linked {status.phone ?? ''}
              </Text>
            </View>
          ) : linkCode || status?.pending_code ? (
            <View className="rounded-lg bg-amber-50 px-sm py-sm dark:bg-amber-950/40">
              <Text className="font-sans-semibold text-body-md text-amber-900 dark:text-amber-100">
                Send this to your Split It WhatsApp number:
              </Text>
              <Text className="mt-xs font-sans-bold text-headline-sm text-primary">
                LINK {linkCode ?? '······'}
              </Text>
              <Text className="mt-xs font-sans text-label-md text-on-surface-variant">
                Code expires in 15 minutes. Use the same phone number as above.
              </Text>
            </View>
          ) : (
            <Text className="font-sans text-body-md text-on-surface-variant">
              Save your phone number above, then generate a link code.
            </Text>
          )}

          {!status?.verified ? (
            <Pressable
              onPress={() => void handleRequestLink()}
              disabled={isWorking}
              className="items-center rounded-lg bg-[#25D366] py-sm active:opacity-90 disabled:opacity-50"
            >
              <Text className="font-sans-semibold text-body-md text-white">
                {isWorking ? 'Working…' : 'Generate link code'}
              </Text>
            </Pressable>
          ) : (
            <>
              <Text className="font-sans-semibold text-label-md text-on-surface-variant">
                Default group for new expenses
              </Text>
              <View className="gap-xs">
                {groups.length === 0 ? (
                  <Text className="font-sans text-body-md text-on-surface-variant">
                    Create a group in the app first.
                  </Text>
                ) : (
                  groups.map((group) => {
                    const isDefault = status.default_group_id === group.id;
                    return (
                      <Pressable
                        key={group.id}
                        onPress={() => void handleSetDefaultGroup(group.id)}
                        disabled={isWorking}
                        className={`flex-row items-center justify-between rounded-lg border px-sm py-sm active:bg-surface-container-low ${
                          isDefault
                            ? 'border-primary bg-primary/5'
                            : 'border-outline-variant/40'
                        }`}
                      >
                        <Text className="font-sans-medium text-body-md text-on-surface">
                          {group.name}
                        </Text>
                        {isDefault ? (
                          <MaterialIcons name="check-circle" size={20} color="#0F6E56" />
                        ) : null}
                      </Pressable>
                    );
                  })
                )}
              </View>

              <Pressable
                onPress={() => void handleUnlink()}
                disabled={isWorking}
                className="mt-xs items-center rounded-lg border border-outline-variant py-sm active:bg-surface-container-low"
              >
                <Text className="font-sans-semibold text-body-md text-error">
                  Unlink WhatsApp
                </Text>
              </Pressable>
            </>
          )}

          <Pressable
            onPress={() =>
              Alert.alert('WhatsApp commands', WHATSAPP_HELP_TEXT)
            }
            className="flex-row items-center gap-xs py-xs"
          >
            <MaterialIcons name="info-outline" size={18} color="#0F6E56" />
            <Text className="font-sans-semibold text-label-md text-primary">
              Message examples
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
