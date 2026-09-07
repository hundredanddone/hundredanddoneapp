import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

import { Avatar, Banner, Button, Card, LoadingScreen, Screen, Text } from '@/components';
import { radius, spacing } from '@/constants/theme';
import { useAppointment, useUpdateAppointmentStatus } from '@/features/appointments';
import { StatusBadge } from '@/features/appointments/StatusBadge';
import { useTheme } from '@/hooks/useTheme';
import { dayjs } from '@/lib/time';

export default function PatientAppointmentDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: appointment, isPending } = useAppointment(id);
  const updateStatus = useUpdateAppointmentStatus();
  const [error, setError] = useState<string | null>(null);

  if (isPending) return <LoadingScreen />;
  if (!appointment) {
    return (
      <Screen>
        <Banner tone="danger" title="Appointment not found" />
      </Screen>
    );
  }

  const when = dayjs(appointment.scheduled_at);
  const isHomeVisit = appointment.visit_type === 'home';
  const canCancel = ['pending', 'confirmed'].includes(appointment.status);
  const address = appointment.patient_addresses;

  const handleCancel = async () => {
    setError(null);
    try {
      await updateStatus.mutateAsync({ id: appointment.id, status: 'cancelled' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel this appointment.');
    }
  };

  return (
    <Screen
      scroll
      footer={
        canCancel ? (
          <Button
            label="Cancel appointment"
            variant="secondary"
            loading={updateStatus.isPending}
            onPress={() => void handleCancel()}
          />
        ) : undefined
      }
    >
      <View style={styles.header}>
        <Avatar
          uri={appointment.organizations?.logo_url}
          name={appointment.organizations?.name}
          size={56}
        />
        <View style={styles.headerBody}>
          <Text variant="title">{appointment.organizations?.name ?? 'Provider'}</Text>
          <Text variant="caption" color="textMuted">
            {appointment.service_offerings?.services?.name ?? 'Appointment'}
          </Text>
        </View>
      </View>

      <StatusBadge status={appointment.status} />

      {error ? <Banner tone="danger" title="Something went wrong" message={error} /> : null}

      {appointment.status === 'en_route' && isHomeVisit ? (
        <Banner
          tone="info"
          title="Your doctor is on the way"
          message="You'll get a notification when they arrive."
        />
      ) : null}

      <Card>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <View style={styles.detailBody}>
            <Text variant="bodyStrong">{when.format('dddd, D MMMM YYYY')}</Text>
            <Text variant="caption" color="textMuted">
              {when.format('h:mm A')} · {appointment.service_offerings?.duration_minutes ?? 0} min
            </Text>
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.detailRow}>
          <Ionicons
            name={isHomeVisit ? 'home-outline' : 'business-outline'}
            size={18}
            color={colors.primary}
          />
          <View style={styles.detailBody}>
            <Text variant="bodyStrong">{isHomeVisit ? 'Home visit' : 'Clinic visit'}</Text>
            <Text variant="caption" color="textMuted">
              {isHomeVisit
                ? (address?.address ?? 'Address not set')
                : 'You are visiting the provider'}
            </Text>
          </View>
        </View>
      </Card>

      {isHomeVisit && address?.lat != null && address?.lng != null ? (
        <View style={styles.mapWrap}>
          <MapView
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: address.lat,
              longitude: address.lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            pointerEvents="none"
          >
            <Marker coordinate={{ latitude: address.lat, longitude: address.lng }} />
          </MapView>
        </View>
      ) : null}

      <Card>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={18} color={colors.primary} />
          <View style={styles.detailBody}>
            <Text variant="bodyStrong">
              {appointment.fee != null ? `${appointment.fee}` : 'Fee not set'}
            </Text>
            <Text variant="caption" color="textMuted">
              Payment status: {appointment.payment_status}
            </Text>
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  headerBody: { flex: 1, gap: 2 },
  detailRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  detailBody: { flex: 1, gap: 2 },
  mapWrap: {
    height: 180,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
});
