import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { EmptyState, LoadingScreen, Screen, Text } from '@/components';
import { radius, spacing } from '@/constants/theme';
import { AppointmentCard } from '@/features/appointments/AppointmentCard';
import { useOrgAppointments } from '@/features/appointments';
import { useActiveOrganization } from '@/features/org-setup';
import { useTheme } from '@/hooks/useTheme';
import { dayjs } from '@/lib/time';

export default function OrgAppointmentsScreen() {
  const { colors } = useTheme();
  const { organizationId, isPending } = useActiveOrganization();
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

  const dates = useMemo(
    () => Array.from({ length: 14 }, (_, index) => dayjs().add(index, 'day')),
    [],
  );

  const {
    data: appointments = [],
    isFetching,
    refetch,
  } = useOrgAppointments(organizationId, { date: selectedDate });

  if (isPending) return <LoadingScreen />;

  return (
    <Screen padded={false} edges={{ top: true, bottom: false }}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="display">Schedule</Text>
            <View style={styles.dateRow}>
              {dates.map((date) => {
                const key = date.format('YYYY-MM-DD');
                const selected = key === selectedDate;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setSelectedDate(key)}
                    style={[
                      styles.dateCell,
                      {
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      variant="label"
                      style={{ color: selected ? colors.onPrimary : colors.textMuted }}
                    >
                      {date.format('ddd').toUpperCase()}
                    </Text>
                    <Text
                      variant="bodyStrong"
                      style={{ color: selected ? colors.onPrimary : colors.text }}
                    >
                      {date.format('D')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Nothing booked"
            message={`No appointments on ${dayjs(selectedDate).format('D MMMM')}.`}
          />
        }
        renderItem={({ item }) => (
          <AppointmentCard
            appointment={item}
            perspective="org"
            onPress={() => router.push(`/appointment/${item.id}`)}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  header: { gap: spacing.md, paddingBottom: spacing.sm },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dateCell: {
    width: 56,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
});
