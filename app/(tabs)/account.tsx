import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { CurrencyPicker } from '@/components/CurrencyPicker';
import { PaymentMethodRow } from '@/components/PaymentMethodRow';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ProfileTextField } from '@/components/ProfileTextField';
import { ProfileToggleRow } from '@/components/ProfileToggleRow';
import { TopAppBar } from '@/components/TopAppBar';
import {
  getPushNotificationHelpMessage,
  registerForPushNotifications,
} from '@/lib/notifications';
import { platformShadow } from '@/lib/platformShadow';
import {
  DEFAULT_PROFILE_PREFERENCES,
  displayNameFromProfile,
  fetchUserProfile,
  loadProfilePreferences,
  saveProfilePreferences,
  updateUserProfile,
  type PaymentMethod,
  type ProfilePreferences,
  type UserProfile,
} from '@/lib/profile';
import { useAuthStore } from '@/stores/authStore';

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="px-1 font-sans-semibold text-headline-sm text-on-surface">
      {children}
    </Text>
  );
}

export default function AccountScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [prefs, setPrefs] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;

    const emailValue = user.email ?? '';
    setEmail(emailValue);

    try {
      const [profileRow, savedPrefs] = await Promise.all([
        fetchUserProfile(user.id, emailValue),
        loadProfilePreferences(user.id),
      ]);
      setProfile(profileRow);
      setPrefs(savedPrefs);
      setFullName(
        profileRow.display_name?.trim() ||
          displayNameFromProfile(profileRow, emailValue)
      );
    } catch {
      setProfile({
        id: user.id,
        display_name: null,
        avatar_url: null,
        email: emailValue,
      });
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    load();
  }, [load]);

  async function persistPrefs(next: ProfilePreferences) {
    if (!user?.id) return;
    setPrefs(next);
    await saveProfilePreferences(user.id, next);
  }

  async function handleSaveName() {
    if (!user?.id || !fullName.trim()) return;
    setIsSaving(true);
    try {
      await updateUserProfile(user.id, { display_name: fullName.trim() });
      setProfile((p) =>
        p ? { ...p, display_name: fullName.trim() } : p
      );
    } catch (e) {
      Alert.alert(
        'Could not save',
        e instanceof Error ? e.message : 'Failed to update profile'
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEnableNotifications() {
    const token = await registerForPushNotifications();
    Alert.alert(
      token ? 'Notifications enabled' : 'Could not enable notifications',
      token
        ? 'Your device is registered for expense alerts.'
        : getPushNotificationHelpMessage()
    );
  }

  function addPaymentMethod(type: PaymentMethod['type'], name: string) {
    const method: PaymentMethod = {
      id: `${Date.now()}`,
      type,
      name,
      masked: type === 'wallet' ? '9841******' : '**** 4582',
    };
    void persistPrefs({
      ...prefs,
      paymentMethods: [...prefs.paymentMethods, method],
    });
  }

  function handleAddPaymentMethod() {
    Alert.alert('Add payment method', 'Choose a type to add', [
      {
        text: 'Bank account',
        onPress: () => addPaymentMethod('bank', 'Bank account'),
      },
      {
        text: 'eSewa / Khalti',
        onPress: () => addPaymentMethod('wallet', 'eSewa ID'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleDeletePaymentMethod(id: string) {
    const next = {
      ...prefs,
      paymentMethods: prefs.paymentMethods.filter((m) => m.id !== id),
    };
    void persistPrefs(next);
  }

  function handleDeactivate() {
    Alert.alert(
      'Deactivate account',
      'Account deactivation is not available yet. Contact support if you need to close your account.',
      [{ text: 'OK' }]
    );
  }

  function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  const displayName = displayNameFromProfile(profile, email);

  return (
    <View className="flex-1 bg-background">
      <TopAppBar onNotificationsPress={handleEnableNotifications} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 120,
          maxWidth: 480,
          width: '100%',
          alignSelf: 'center',
          gap: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ProfileHeader
          name={fullName.trim() || displayName}
          email={email}
          avatarUrl={profile?.avatar_url ?? null}
        />

        <View className="gap-stack-gap">
          <SectionTitle>Personal Information</SectionTitle>
          <View
            className="gap-md rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md"
            style={platformShadow('card')}
          >
            <ProfileTextField
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
            />
            <ProfileTextField
              label="Email"
              value={email}
              onChangeText={() => {}}
              editable={false}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View className="flex-row gap-md">
              <View className="flex-1">
                <ProfileTextField
                  label="Phone Number"
                  value={prefs.phone}
                  onChangeText={(phone) => setPrefs((p) => ({ ...p, phone }))}
                  onBlur={() => void persistPrefs(prefs)}
                  placeholder="+1 555 000 0000"
                  keyboardType="phone-pad"
                />
              </View>
              <View className="flex-1 gap-xs">
                <Text className="ml-1 font-sans-semibold text-label-md text-on-surface-variant">
                  Default Currency
                </Text>
                <CurrencyPicker
                  variant="profile"
                  value={prefs.defaultCurrency}
                  onChange={(code) => {
                    const next = { ...prefs, defaultCurrency: code };
                    void persistPrefs(next);
                  }}
                />
              </View>
            </View>
            <ProfileToggleRow
              title="Show converted amounts"
              subtitle="≈ values in your default currency (daily rates via Frankfurter)"
              value={prefs.showConvertedToDefaultCurrency ?? true}
              onValueChange={(showConvertedToDefaultCurrency) => {
                const next = {
                  ...prefs,
                  showConvertedToDefaultCurrency,
                };
                setPrefs(next);
                void persistPrefs(next);
              }}
              showDivider={false}
              icon="currency-exchange"
            />
            <Pressable
              onPress={handleSaveName}
              disabled={isSaving || !fullName.trim()}
              className="items-center rounded-lg bg-primary py-sm active:opacity-90 disabled:opacity-50"
            >
              <Text className="font-sans-semibold text-body-md text-on-primary">
                {isSaving ? 'Saving…' : 'Save profile'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="gap-stack-gap">
          <View className="flex-row items-center justify-between px-1">
            <SectionTitle>Payment Methods</SectionTitle>
            <Pressable onPress={handleAddPaymentMethod}>
              <Text className="font-sans-semibold text-label-md text-primary">
                + Add New
              </Text>
            </Pressable>
          </View>
          {prefs.paymentMethods.length === 0 ? (
            <View className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-md">
              <Text className="text-center font-sans text-body-md text-on-surface-variant">
                No payment methods yet. Tap + Add New to add Khalti, eSewa, or a
                bank account.
              </Text>
            </View>
          ) : (
            <View className="gap-sm">
              {prefs.paymentMethods.map((method) => (
                <PaymentMethodRow
                  key={method.id}
                  method={method}
                  onDelete={() => handleDeletePaymentMethod(method.id)}
                />
              ))}
            </View>
          )}
        </View>

        <View className="gap-stack-gap">
          <SectionTitle>Notifications</SectionTitle>
          <View
            className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest"
            style={platformShadow('card')}
          >
            <ProfileToggleRow
              title="Expense Updates"
              subtitle="When someone adds or edits an expense"
              value={prefs.notifications.expenseUpdates}
              onValueChange={(expenseUpdates) =>
                persistPrefs({
                  ...prefs,
                  notifications: { ...prefs.notifications, expenseUpdates },
                })
              }
            />
            <ProfileToggleRow
              title="Settlements"
              subtitle="When a payment is recorded"
              value={prefs.notifications.settlements}
              onValueChange={(settlements) =>
                persistPrefs({
                  ...prefs,
                  notifications: { ...prefs.notifications, settlements },
                })
              }
            />
            <ProfileToggleRow
              title="Group Activity"
              subtitle="New member joins or leave groups"
              value={prefs.notifications.groupActivity}
              onValueChange={(groupActivity) =>
                persistPrefs({
                  ...prefs,
                  notifications: { ...prefs.notifications, groupActivity },
                })
              }
            />
            <ProfileToggleRow
              title="Monthly Reports"
              subtitle="Detailed summary of monthly spends"
              value={prefs.notifications.monthlyReports}
              onValueChange={(monthlyReports) =>
                persistPrefs({
                  ...prefs,
                  notifications: { ...prefs.notifications, monthlyReports },
                })
              }
              showDivider={false}
            />
          </View>
        </View>

        <View className="gap-stack-gap">
          <SectionTitle>Security & Privacy</SectionTitle>
          <View
            className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest"
            style={platformShadow('card')}
          >
            <ProfileToggleRow
              icon="visibility"
              title="Public Profile"
              subtitle="Allow others to find you by email"
              value={prefs.privacy.publicProfile}
              onValueChange={(publicProfile) =>
                persistPrefs({
                  ...prefs,
                  privacy: { ...prefs.privacy, publicProfile },
                })
              }
            />
            <ProfileToggleRow
              icon="security"
              title="Two-Factor Auth"
              subtitle="Extra security for your account"
              value={prefs.privacy.twoFactorAuth}
              onValueChange={(twoFactorAuth) =>
                persistPrefs({
                  ...prefs,
                  privacy: { ...prefs.privacy, twoFactorAuth },
                })
              }
              showDivider={false}
            />
          </View>
        </View>

        <View className="gap-stack-gap pb-md">
          <Text className="px-1 font-sans-semibold text-headline-sm text-error">
            Danger Zone
          </Text>
          <View className="gap-sm">
            <Pressable
              onPress={handleLogout}
              className="flex-row items-center justify-center gap-sm rounded-xl border border-error/20 bg-surface-container-lowest py-md active:opacity-90"
              style={platformShadow('card')}
            >
              <MaterialIcons name="logout" size={22} color="#ba1a1a" />
              <Text className="font-sans text-body-lg text-error">Logout</Text>
            </Pressable>
            <Pressable
              onPress={handleDeactivate}
              className="flex-row items-center justify-center gap-sm rounded-xl bg-error/10 py-md active:opacity-90"
            >
              <MaterialIcons name="delete-forever" size={22} color="#ba1a1a" />
              <Text className="font-sans text-body-lg text-error">
                Deactivate Account
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
