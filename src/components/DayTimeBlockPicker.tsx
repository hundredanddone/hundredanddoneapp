import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  DAY_LABELS,
  WEEK_ORDER,
  blocksOverlap,
  isValidBlock,
  minutesToTime,
  sortBlocks,
  timeToMinutes,
} from '@/lib/time';
import type { DayOfWeek, TimeBlock, WeeklyAvailability } from '@/types';

import { Chip } from './Chip';
import { Text } from './Text';
import { TimeSelect } from './TimeSelect';

export const EMPTY_WEEK: WeeklyAvailability = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

const DEFAULT_BLOCK: TimeBlock = { start: '10:00', end: '13:00' };

export interface DayTimeBlockPickerProps {
  value: WeeklyAvailability;
  onChange: (next: WeeklyAvailability) => void;
  slotDurationMinutes: number;
  onSlotDurationChange: (minutes: number) => void;
}

const SLOT_CHOICES = [10, 15, 20, 30, 45, 60];

/**
 * Day-of-week toggles plus one or more time blocks per active day, e.g.
 * Mon 10:00–13:00 and 17:00–20:00. Used for both clinic and home-visit hours;
 * each usage owns its own independent value.
 */
export function DayTimeBlockPicker({
  value,
  onChange,
  slotDurationMinutes,
  onSlotDurationChange,
}: DayTimeBlockPickerProps) {
  const { colors } = useTheme();

  const setDayBlocks = (day: DayOfWeek, blocks: TimeBlock[]) => {
    onChange({ ...value, [day]: sortBlocks(blocks) });
  };

  const toggleDay = (day: DayOfWeek) => {
    const active = value[day].length > 0;
    setDayBlocks(day, active ? [] : [{ ...DEFAULT_BLOCK }]);
  };

  const addBlock = (day: DayOfWeek) => {
    const existing = sortBlocks(value[day]);
    const last = existing[existing.length - 1];
    const startMinutes = last
      ? Math.min(timeToMinutes(last.end) + 60, 22 * 60)
      : timeToMinutes(DEFAULT_BLOCK.start);
    const next: TimeBlock = {
      start: minutesToTime(startMinutes),
      end: minutesToTime(Math.min(startMinutes + 180, 24 * 60)),
    };
    setDayBlocks(day, [...existing, next]);
  };

  const updateBlock = (day: DayOfWeek, index: number, patch: Partial<TimeBlock>) => {
    const next = value[day].map((block, i) => (i === index ? { ...block, ...patch } : block));
    setDayBlocks(day, next);
  };

  const removeBlock = (day: DayOfWeek, index: number) => {
    setDayBlocks(
      day,
      value[day].filter((_, i) => i !== index),
    );
  };

  const activeDays = WEEK_ORDER.filter((day) => value[day].length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          DAYS YOU ARE AVAILABLE
        </Text>
        <View style={styles.dayRow}>
          {WEEK_ORDER.map((day) => (
            <Chip
              key={day}
              label={DAY_LABELS[day]}
              selected={value[day].length > 0}
              onPress={() => toggleDay(day)}
            />
          ))}
        </View>
      </View>

      {activeDays.map((day) => (
        <View
          key={day}
          style={[styles.dayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.dayHeader}>
            <Text variant="bodyStrong">{DAY_LABELS[day]}</Text>
            <Pressable onPress={() => addBlock(day)} hitSlop={8} accessibilityRole="button">
              <View style={styles.addRow}>
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text variant="caption" color="primary">
                  Add time block
                </Text>
              </View>
            </Pressable>
          </View>

          {value[day].map((block, index) => {
            const invalid =
              !isValidBlock(block) ||
              value[day].some((other, i) => i !== index && blocksOverlap(block, other));
            return (
              <View key={`${day}-${index}`} style={styles.blockRow}>
                <TimeSelect
                  value={block.start}
                  onChange={(start) => updateBlock(day, index, { start })}
                  label="From"
                />
                <TimeSelect
                  value={block.end}
                  onChange={(end) => updateBlock(day, index, { end })}
                  label="To"
                  minTime={block.start}
                />
                <Pressable
                  onPress={() => removeBlock(day, index)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Remove time block"
                  style={styles.removeButton}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
                {invalid ? (
                  <Text variant="caption" color="danger" style={styles.blockError}>
                    End time must be after the start time and blocks must not overlap.
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          APPOINTMENT SLOT LENGTH
        </Text>
        <View style={styles.dayRow}>
          {SLOT_CHOICES.map((minutes) => (
            <Chip
              key={minutes}
              label={`${minutes} min`}
              selected={slotDurationMinutes === minutes}
              onPress={() => onSlotDurationChange(minutes)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  section: { gap: spacing.sm },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dayCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  blockRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, flexWrap: 'wrap' },
  removeButton: { paddingBottom: spacing.md },
  blockError: { width: '100%' },
});
