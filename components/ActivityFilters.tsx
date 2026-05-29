import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';

import type { ActivityFilter } from '@/lib/activity';
import { platformShadow } from '@/lib/platformShadow';

const FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: 'all', label: 'All Activity' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'payments', label: 'Payments' },
  { id: 'groups', label: 'Groups' },
];

export function ActivityFilters({
  active,
  counts,
  onChange,
}: {
  active: ActivityFilter;
  counts: Record<ActivityFilter, number>;
  onChange: (filter: ActivityFilter) => void;
}) {
  return (
    <View
      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md"
      style={platformShadow('card')}
    >
      <View className="mb-sm flex-row items-center gap-xs">
        <MaterialIcons name="filter-list" size={20} color="#151c27" />
        <Text className="font-sans-semibold text-headline-sm text-on-surface">
          Filters
        </Text>
      </View>

      <View className="gap-xs">
        {FILTERS.map((f) => {
          const selected = active === f.id;
          const count = counts[f.id];
          return (
            <Pressable
              key={f.id}
              onPress={() => onChange(f.id)}
              className={`flex-row items-center gap-sm rounded-lg p-sm ${
                selected ? 'bg-surface-container' : 'active:bg-surface-container-low'
              }`}
            >
              <View
                className={`h-5 w-5 items-center justify-center rounded border ${
                  selected
                    ? 'border-primary bg-primary'
                    : 'border-outline-variant bg-background'
                }`}
              >
                {selected ? (
                  <MaterialIcons name="check" size={14} color="#ffffff" />
                ) : null}
              </View>
              <Text className="flex-1 font-sans text-body-md text-on-surface">
                {f.label}
              </Text>
              {f.id !== 'all' && count > 0 ? (
                <View className="rounded-full bg-surface-container-high px-2 py-0.5">
                  <Text className="font-sans-semibold text-[10px] text-on-surface-variant">
                    {count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
