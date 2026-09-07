import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Chip, EmptyState, LoadingScreen, Screen, Text } from '@/components';
import { spacing } from '@/constants/theme';
import { AppointmentCard } from '@/features/appointments/AppointmentCard';
import { usePatientAppointments, type AppointmentScope } from '@/features/appointments';

export default function PatientAppointmentsScreen() {
  const [scope, setScope] = useState<AppointmentScope>('upcoming');
  const { data: appointments = [], isPending, isFetching, refetch } = usePatientAppointments(scope);

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
            <Text variant="display">Appointments</Text>
            <View style={styles.tabs}>
              <Chip
                label="Upcoming"
                selected={scope === 'upcoming'}
                onPress={() => setScope('upcoming')}
              />
              <Chip label="Past" selected={scope === 'past'} onPress={() => setScope('past')} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={
              scope === 'upcoming' ? 'No upcoming appointments' : 'Nothing in your history yet'
            }
            message={
              scope === 'upcoming'
                ? 'Find a doctor, clinic or hospital and book your first visit.'
                : 'Completed and cancelled appointments show up here.'
            }
            actionLabel={scope === 'upcoming' ? 'Find care' : undefined}
            onPressAction={scope === 'upcoming' ? () => router.push('/home') : undefined}
          />
        }
        renderItem={({ item }) => (
          <AppointmentCard
            appointment={item}
            perspective="patient"
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
  tabs: { flexDirection: 'row', gap: spacing.sm },
});
