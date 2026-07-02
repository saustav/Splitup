import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { uiColors } from '@/constants/theme';
import {
  addMonths,
  calendarMonthGrid,
  formatExpenseDate,
  isSameDay,
  isSameMonth,
  parseISODate,
  startOfMonth,
  today,
  toISODateString,
} from '@/lib/dates';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CELL_WIDTH = `${100 / 7}%` as ViewStyle['width'];
const CELL_HEIGHT = 44;

type ExpenseDatePickerProps = {
  value: string;
  onChange: (isoDate: string) => void;
  disabled?: boolean;
};

function CalendarGrid({
  selected,
  onSelect,
}: {
  selected: Date;
  onSelect: (date: Date) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected));
  const weeks = useMemo(() => calendarMonthGrid(viewMonth), [viewMonth]);
  const monthLabel = viewMonth.toLocaleDateString('en-NP', {
    month: 'long',
    year: 'numeric',
  });
  const todayDate = today();

  useEffect(() => {
    setViewMonth(startOfMonth(selected));
  }, [selected]);

  function handleSelect(date: Date) {
    onSelect(date);
    if (!isSameMonth(date, viewMonth)) {
      setViewMonth(startOfMonth(date));
    }
  }

  return (
    <View className="w-full">
      <View className="mb-md flex-row items-center justify-between">
        <Pressable
          onPress={() => setViewMonth((m) => addMonths(m, -1))}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-container"
          accessibilityLabel="Previous month"
        >
          <MaterialIcons name="chevron-left" size={24} color={uiColors.iconOnLight} />
        </Pressable>
        <Text className="font-sans-semibold text-headline-sm text-on-surface">
          {monthLabel}
        </Text>
        <Pressable
          onPress={() => setViewMonth((m) => addMonths(m, 1))}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-container"
          accessibilityLabel="Next month"
        >
          <MaterialIcons name="chevron-right" size={24} color={uiColors.iconOnLight} />
        </Pressable>
      </View>

      <View className="mb-xs flex-row">
        {WEEKDAY_LABELS.map((label) => (
          <View
            key={label}
            style={{ width: CELL_WIDTH, height: 28 }}
            className="items-center justify-center"
          >
            <Text className="font-sans-semibold text-label-md text-on-surface-variant">
              {label}
            </Text>
          </View>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} className="flex-row">
          {week.map((cell, dayIndex) => {
            const selectedDay = isSameDay(cell.date, selected);
            const isToday = isSameDay(cell.date, todayDate);

            return (
              <Pressable
                key={`${cell.date.toISOString()}-${dayIndex}`}
                onPress={() => handleSelect(cell.date)}
                style={{ width: CELL_WIDTH, height: CELL_HEIGHT }}
                className="items-center justify-center"
              >
                <View
                  className={`h-9 w-9 items-center justify-center rounded-full ${
                    selectedDay
                      ? 'bg-primary'
                      : isToday
                        ? 'border border-primary bg-secondary-container'
                        : ''
                  }`}
                >
                  <Text
                    className={`font-sans-medium text-body-md ${
                      selectedDay
                        ? 'text-on-primary'
                        : cell.inCurrentMonth
                          ? 'text-on-surface'
                          : 'text-on-surface-variant/50'
                    }`}
                  >
                    {cell.date.getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function ExpenseDatePicker({
  value,
  onChange,
  disabled = false,
}: ExpenseDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() =>
    value ? parseISODate(value) : today()
  );

  const selected = value ? parseISODate(value) : today();
  const label = formatExpenseDate(selected);

  function openPicker() {
    if (disabled) return;
    setDraft(selected);
    setOpen(true);
  }

  function confirmSelection() {
    onChange(toISODateString(draft));
    setOpen(false);
  }

  function handleAndroidChange(event: DateTimePickerEvent, date?: Date) {
    if (event.type === 'set' && date) {
      onChange(toISODateString(date));
    }
    setOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        className="flex-row items-center rounded-lg border border-outline-variant bg-background py-sm pl-10 pr-3"
      >
        <MaterialIcons
          name="calendar-today"
          size={20}
          color={uiColors.muted}
          style={{ position: 'absolute', left: 12 }}
        />
        <Text className="flex-1 font-sans text-body-lg text-on-surface">
          {label}
        </Text>
        <MaterialIcons name="expand-more" size={22} color={uiColors.muted} />
      </Pressable>

      {Platform.OS === 'android' && open ? (
        <DateTimePicker
          value={draft}
          mode="date"
          display="calendar"
          onChange={handleAndroidChange}
        />
      ) : null}

      {Platform.OS !== 'android' && open ? (
        <Modal visible transparent animationType="fade">
          <Pressable
            className="flex-1 justify-end bg-black/40"
            onPress={() => setOpen(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="rounded-t-3xl bg-surface-container-lowest px-lg pb-lg pt-md"
            >
              <View className="mb-md items-center">
                <View className="h-1 w-10 rounded-full bg-outline-variant" />
              </View>

              <Text className="mb-md font-sans-semibold text-headline-sm text-on-surface">
                Choose date
              </Text>

              <CalendarGrid selected={draft} onSelect={setDraft} />

              <View className="mt-md flex-row justify-end gap-md">
                <Pressable
                  onPress={() => setOpen(false)}
                  className="rounded-lg border border-outline-variant px-lg py-sm active:bg-surface-container"
                >
                  <Text className="font-sans-semibold text-label-md text-primary">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={confirmSelection}
                  className="rounded-lg bg-primary-container px-lg py-sm active:opacity-95"
                >
                  <Text className="font-sans-semibold text-label-md text-on-primary">
                    Done
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}
