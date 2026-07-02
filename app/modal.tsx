import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, View } from 'react-native';

const STACK = [
  { name: 'Expo + React Native', role: 'iOS, Android & Web from one codebase' },
  { name: 'NativeWind', role: 'Tailwind CSS styling' },
  { name: 'Supabase', role: 'Postgres database, realtime sync & auth' },
  { name: 'Zustand', role: 'Lightweight global state' },
  { name: 'Expo Router', role: 'File-based navigation' },
  { name: 'Expo Notifications', role: 'Push notifications' },
  { name: 'GitHub Pages', role: 'Web hosting' },
  { name: 'GitHub', role: 'Version control' },
];

export default function ModalScreen() {
  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <StatusBar style="auto" />
      <ScrollView className="flex-1 px-6 pt-12">
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
          Your stack
        </Text>
        <Text className="mt-2 text-neutral-600 dark:text-neutral-400">
          Everything wired and ready for you to build on.
        </Text>

        {STACK.map((item) => (
          <View
            key={item.name}
            className="mt-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <Text className="font-semibold text-brand-600">{item.name}</Text>
            <Text className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {item.role}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
