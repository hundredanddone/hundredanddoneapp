import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatTimeLabel, timeOptions, timeToMinutes } from '@/lib/time';

import { Text } from './Text';

export interface TimeSelectProps {
  /** 'HH:mm' */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** Only offer times strictly after this one (used to keep end > start). */
  minTime?: string;
  stepMinutes?: number;
}

/**
 * Time picker snapped to fixed increments rather than a free-form native picker —
 * appointment slots are always aligned to a step, so this removes an invalid state.
 */
export function TimeSelect({ value, onChange, label, minTime, stepMinutes = 15 }: TimeSelectProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    const all = timeOptions(stepMinutes);
    if (!minTime) return all;
    return all.filter((t) => timeToMinutes(t) > timeToMinutes(minTime));
  }, [minTime, stepMinutes]);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" color="textMuted">
          {label}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        <Text variant="body">{formatTimeLabel(value)}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
          onPress={() => setOpen(false)}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text variant="heading" style={styles.sheetTitle}>
              {label ?? 'Select time'}
            </Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              initialNumToRender={24}
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                    style={[
                      styles.option,
                      selected ? { backgroundColor: colors.primarySoft } : null,
                    ]}
                  >
                    <Text variant="body" color={selected ? 'primary' : 'text'}>
                      {formatTimeLabel(item)}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs, flex: 1 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingVertical: spacing.lg,
  },
  sheetTitle: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
