import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AutosaveIndicator } from "@/components/AutosaveIndicator";
import { CurrencyPicker } from "@/components/CurrencyPicker";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ProfileTextField } from "@/components/ProfileTextField";
import { ProfileToggleRow } from "@/components/ProfileToggleRow";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { layout } from "@/constants/layout";
import { uiColors } from "@/constants/theme";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useAutosaveStatus } from "@/hooks/useAutosaveStatus";
import {
  canRegisterForPushNotifications,
  getPushNotificationHelpMessage,
  registerAndSavePushToken,
} from "@/lib/notifications";
import {
    DEFAULT_PROFILE_PREFERENCES,
    displayNameFromProfile,
    fetchUserProfile,
    loadProfilePreferences,
    saveProfilePreferences,
    updateUserProfile,
    type ProfilePreferences,
    type UserProfile,
} from "@/lib/profile";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="px-1 font-sans-medium text-body-md text-on-surface">
      {children}
    </Text>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const themeMode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [prefs, setPrefs] = useState<ProfilePreferences>(
    DEFAULT_PROFILE_PREFERENCES,
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const savedNameRef = useRef("");
  const saveCountRef = useRef(0);
  const autosaveStatus = useAutosaveStatus(isSavingProfile);

  const load = useCallback(async () => {
    if (!user?.id) return;

    const emailValue = user.email ?? "";
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
          displayNameFromProfile(profileRow, emailValue),
      );
      savedNameRef.current =
        profileRow.display_name?.trim() ||
        displayNameFromProfile(profileRow, emailValue);
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

  function beginProfileSave() {
    saveCountRef.current += 1;
    setIsSavingProfile(true);
  }

  function endProfileSave() {
    saveCountRef.current = Math.max(0, saveCountRef.current - 1);
    if (saveCountRef.current === 0) {
      setIsSavingProfile(false);
    }
  }

  async function persistPrefs(next: ProfilePreferences) {
    if (!user?.id) return;
    beginProfileSave();
    try {
      setPrefs(next);
      await saveProfilePreferences(user.id, next);
    } finally {
      endProfileSave();
    }
  }

  const debouncedPersistPrefs = useDebouncedCallback(
    (next: ProfilePreferences) => {
      void persistPrefs(next);
    },
    500,
  );

  const saveDisplayName = useCallback(
    async (name: string) => {
      if (!user?.id) return;
      const trimmed = name.trim();
      if (!trimmed || trimmed === savedNameRef.current) return;

      beginProfileSave();
      try {
        await updateUserProfile(user.id, { display_name: trimmed });
        savedNameRef.current = trimmed;
        setProfile((p) => (p ? { ...p, display_name: trimmed } : p));
      } catch (e) {
        Alert.alert(
          "Could not save",
          e instanceof Error ? e.message : "Failed to update profile",
        );
      } finally {
        endProfileSave();
      }
    },
    [user?.id],
  );

  const debouncedSaveName = useDebouncedCallback((name: string) => {
    void saveDisplayName(name);
  }, 500);

  function handleNameChange(text: string) {
    setFullName(text);
    debouncedSaveName(text);
  }

  async function handleEnableNotifications() {
    if (!user?.id) return;
    const token = await registerAndSavePushToken(user.id);
    Alert.alert(
      token ? "Notifications enabled" : "Could not enable notifications",
      token
        ? "Your device is registered for alerts."
        : getPushNotificationHelpMessage(),
    );
  }

  function handleDeactivate() {
    Alert.alert(
      "Deactivate account",
      "Account deactivation is not available yet. Contact support if you need to close your account.",
      [{ text: "OK" }],
    );
  }

  function handleLogout() {
    setLogoutVisible(true);
  }

  async function performLogout() {
    setIsLoggingOut(true);
    try {
      await signOut();
      setLogoutVisible(false);
      router.replace("/login");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sign out failed";
      Alert.alert("Log out failed", message);
    } finally {
      setIsLoggingOut(false);
    }
  }

  const displayName = displayNameFromProfile(profile, email);

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader variant="tab" title="Account" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: 4,
          paddingBottom: layout.tabScrollBottom,
          maxWidth: layout.contentMaxWidth,
          width: "100%",
          alignSelf: "center",
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ProfileHeader
          name={fullName.trim() || displayName}
          email={email}
          avatarUrl={profile?.avatar_url ?? null}
        />

        <View className="flex-row justify-end px-1">
          <AutosaveIndicator status={autosaveStatus} />
        </View>

        <View className="gap-stack-gap">
          <SectionTitle>Appearance</SectionTitle>
          <View className="overflow-hidden rounded-card border border-outline-variant/40 bg-surface-container-low">
            <ProfileToggleRow
              icon={themeMode === "dark" ? "dark-mode" : "light-mode"}
              title="Dark mode"
              subtitle={
                themeMode === "dark"
                  ? "Switch to light appearance"
                  : "Switch to dark appearance"
              }
              value={themeMode === "dark"}
              onValueChange={() => void toggleTheme()}
              showDivider={false}
            />
          </View>
        </View>

        <View className="gap-stack-gap">
          <SectionTitle>Personal Information</SectionTitle>
          <View className="gap-md rounded-card border border-outline-variant/40 bg-surface-container-low p-md">
            <ProfileTextField
              label="Full Name"
              value={fullName}
              onChangeText={handleNameChange}
              onBlur={() => void saveDisplayName(fullName)}
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
                  onChangeText={(phone) => {
                    setPrefs((prev) => {
                      const next = { ...prev, phone };
                      debouncedPersistPrefs(next);
                      return next;
                    });
                  }}
                  onBlur={() => {
                    setPrefs((current) => {
                      void persistPrefs(current);
                      return current;
                    });
                  }}
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
          </View>
        </View>

        <View className="gap-stack-gap">
          <SectionTitle>Notifications</SectionTitle>
          <View className="overflow-hidden rounded-card border border-outline-variant/40 bg-surface-container-low">
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
          <View className="overflow-hidden rounded-card border border-outline-variant/40 bg-surface-container-low">
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

        <View className="gap-stack-gap">
          <SectionTitle>Account</SectionTitle>
          <View className="overflow-hidden rounded-card border border-outline-variant/40 bg-surface-container-low">
            {canRegisterForPushNotifications() ? (
              <Pressable
                onPress={handleEnableNotifications}
                className="flex-row items-center justify-between border-b border-outline-variant/30 px-md py-sm active:bg-surface-container-high"
              >
                <View className="flex-row items-center gap-md">
                  <MaterialIcons
                    name="notifications-active"
                    size={20}
                    color={uiColors.iconOnLight}
                  />
                  <Text className="font-sans-medium text-body-md text-on-surface">
                    Enable push notifications
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={uiColors.muted}
                />
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleLogout}
              className="flex-row items-center justify-between border-b border-outline-variant/30 px-md py-sm active:bg-surface-container-high"
            >
              <View className="flex-row items-center gap-md">
                <MaterialIcons name="logout" size={20} color={uiColors.error} />
                <Text className="font-sans-medium text-body-md text-error">
                  Log out
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={uiColors.muted} />
            </Pressable>
            <Pressable
              onPress={handleDeactivate}
              className="flex-row items-center justify-between px-md py-sm active:bg-surface-container-high"
            >
              <View className="flex-row items-center gap-md">
                <MaterialIcons
                  name="delete-forever"
                  size={20}
                  color={uiColors.error}
                />
                <Text className="font-sans-medium text-body-md text-error">
                  Deactivate account
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={uiColors.muted} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={logoutVisible}
        title="Log out"
        message="Are you sure you want to sign out?"
        confirmLabel="Log out"
        destructive
        isLoading={isLoggingOut}
        onCancel={() => !isLoggingOut && setLogoutVisible(false)}
        onConfirm={() => void performLogout()}
      />
    </View>
  );
}
