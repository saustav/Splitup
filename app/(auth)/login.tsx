import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { AppFooter } from "@/components/AppFooter";
import { LoginBackground } from "@/components/LoginBackground";
import { OAuthButton } from "@/components/OAuthButton";
import { APP_NAME } from "@/constants/app";
import { uiColors } from "@/constants/theme";
import { signInWithOAuth } from "@/lib/auth";
import { platformShadow } from "@/lib/platformShadow";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [error, setError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<"google" | "apple" | null>(
    null,
  );
  const session = useAuthStore((s) => s.session);
  const isSigningIn = useAuthStore((s) => s.isSigningIn);
  const setSigningIn = useAuthStore((s) => s.setSigningIn);
  const refreshSession = useAuthStore((s) => s.refreshSession);

  useEffect(() => {
    if (session) {
      router.replace("/(tabs)");
    }
  }, [session, router]);

  async function handleSignIn(provider: "google" | "apple") {
    if (!isSupabaseConfigured) {
      Alert.alert(
        "Supabase not configured",
        "Copy .env.example to .env and add your EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    setError(null);
    setActiveProvider(provider);
    setSigningIn(true);

    try {
      await signInWithOAuth(provider);
      await refreshSession();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sign in failed";
      if (message !== "Sign in was cancelled") {
        setError(message);
      }
    } finally {
      setActiveProvider(null);
      setSigningIn(false);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <LoginBackground topInset={insets.top} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          className="w-full items-center"
          style={{ paddingTop: insets.top + 24 }}
        >
          <View className="w-[72px] items-center gap-md">
            <View
              className="h-[72px] w-[72px] items-center justify-center rounded-2xl border border-outline-variant/20 bg-white"
              style={platformShadow("card")}
            >
              <MaterialIcons
                name="payments"
                size={32}
                color={uiColors.iconOnLight}
              />
            </View>
            <Text className="w-full text-center font-sans-bold text-headline-sm text-on-surface">
              {APP_NAME}
            </Text>
          </View>
        </View>

        <View
          className="flex-1 justify-center"
          style={{ minHeight: 280 }}
        >
          <View className="w-full items-center">
            <View className="w-full max-w-[280px] gap-sm">
              <OAuthButton
                provider="google"
                onPress={() => handleSignIn("google")}
                disabled={isSigningIn}
                loading={activeProvider === "google"}
              />
              {Platform.OS === "ios" && (
                <OAuthButton
                  provider="apple"
                  onPress={() => handleSignIn("apple")}
                  disabled={isSigningIn}
                  loading={activeProvider === "apple"}
                />
              )}
            </View>

            {error ? (
              <View
                className="mt-lg w-full max-w-[280px] flex-row items-start gap-sm rounded-xl bg-error-container px-md py-md"
                accessibilityRole="alert"
              >
                <MaterialIcons
                  name="error-outline"
                  size={18}
                  color={uiColors.iconOnLight}
                />
                <Text className="flex-1 font-sans text-body-md text-on-error-container">
                  {error}
                </Text>
              </View>
            ) : null}

            {!isSupabaseConfigured ? (
              <View className="mt-lg w-full max-w-[280px] rounded-xl bg-amber-50 px-md py-md dark:bg-amber-950/40">
                <Text className="text-center font-sans text-label-md text-amber-800 dark:text-amber-200">
                  Add Supabase keys to .env to enable sign-in
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <AppFooter />
    </View>
  );
}
