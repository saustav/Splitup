import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";

import { OAuthButton } from "@/components/OAuthButton";
import { APP_NAME } from "@/constants/app";
import { signInWithOAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export default function LoginScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
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
      setSigningIn(false);
    }
  }

  return (
    <View className="flex-1 justify-center bg-white px-6 dark:bg-neutral-950">
      <Text className="text-center text-4xl font-bold text-brand-600">
        {APP_NAME}
      </Text>
      <Text className="mt-2 text-center text-base text-neutral-600 dark:text-neutral-400">
        Sign in to split bills with friends
      </Text>

      <View className="mt-10 gap-3">
        <OAuthButton
          provider="google"
          onPress={() => handleSignIn("google")}
          disabled={isSigningIn}
        />
        {Platform.OS === "ios" && (
          <OAuthButton
            provider="apple"
            onPress={() => handleSignIn("apple")}
            disabled={isSigningIn}
          />
        )}
      </View>

      {isSigningIn && (
        <Text className="mt-4 text-center text-sm text-neutral-500">
          Opening sign-in…
        </Text>
      )}

      {error && (
        <View className="mt-4 rounded-lg bg-red-50 p-3 dark:bg-red-950">
          <Text className="text-center text-sm text-red-700 dark:text-red-300">
            {error}
          </Text>
        </View>
      )}

      {!isSupabaseConfigured && (
        <Text className="mt-6 text-center text-xs text-amber-600 dark:text-amber-400">
          Add Supabase keys to .env to enable sign-in
        </Text>
      )}
    </View>
  );
}
