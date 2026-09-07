import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Banner, Button, Card, Chip, LoadingScreen, Screen, Text } from '@/components';
import { radius, spacing } from '@/constants/theme';
import {
  useCreateAppointment,
  useOffering,
  usePatientAddresses,
  useSlots,
} from '@/features/booking';
import { useTheme } from '@/hooks/useTheme';
import { dayjs, formatTimeLabel } from '@/lib/time';
import { useAuthStore } from '@/stores/authStore';

/** Two weeks of bookable dates, starting today. */
function upcomingDates(count = 14) {
  return Array.from({ length: count }, (_, index) => dayjs().add(index, 'day'));
}

export default function BookingScreen() {
  const { colors } = useTheme();
  const { offeringId } = useLocalSearchParams<{ offeringId: string }>();
  const patientId = useAuthStore((s) => s.session?.user.id ?? null);

  const dates = useMemo(() => upcomingDates(), []);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: offering, isPending } = useOffering(offeringId);
  const organizationId = offering?.services?.organization_id;
  const { data: slots = [], isFetching: slotsLoading } = useSlots(
    organizationId,
    offering?.visit_type ?? 'clinic',
    selectedDate,
  );
  const { data: addresses = [] } = usePatientAddresses();
  const createAppointment = useCreateAppointment();

  const isHomeVisit = offering?.visit_type === 'home';
  const canConfirm = Boolean(selectedSlot) && (!isHomeVisit || Boolean(addressId));

  const handleConfirm = async () => {
    if (!offering || !organizationId || !patientId || !selectedSlot) return;
    setError(null);
    try {
      const appointment = await createAppointment.mutateAsync({
        patientId,
        organizationId,
        serviceOfferingId: offering.id,
        visitType: offering.visit_type,
        scheduledAt: selectedSlot,
        addressId: isHomeVisit ? addressId : null,
        fee: offering.price,
      });
      router.replace(`/(patient)/appointment/${appointment.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not book this appointment.');
    }
  };

  if (isPending) return <LoadingScreen />;
  if (!offering) {
    return (
      <Screen>
        <Banner
          tone="danger"
          title="Service not found"
          message="This service is no longer available."
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      footer={
        <Button
          label={`Confirm booking${offering.price ? ` · ${offering.price}` : ''}`}
          disabled={!canConfirm}
          loading={createAppointment.isPending}
          onPress={() => void handleConfirm()}
        />
      }
    >
      <Card>
        <Text variant="heading">{offering.services?.name ?? 'Appointment'}</Text>
        <Text variant="caption" color="textMuted" style={styles.cardMeta}>
          {offering.services?.organizations?.name} · {offering.duration_minutes} min ·{' '}
          {offering.visit_type === 'home' ? 'Home visit' : 'Clinic visit'}
        </Text>
      </Card>

      {error ? <Banner tone="danger" title="Booking failed" message={error} /> : null}

      <View style={styles.section}>
        <Text variant="heading">Pick a date</Text>
        <View style={styles.dateRow}>
          {dates.map((date) => {
            const key = date.format('YYYY-MM-DD');
            const selected = key === selectedDate;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setSelectedDate(key);
                  setSelectedSlot(null);
                }}
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

      <View style={styles.section}>
        <Text variant="heading">Pick a time</Text>
        {slotsLoading ? (
          <Text variant="caption" color="textMuted">
            Loading available times…
          </Text>
        ) : slots.length === 0 ? (
          <Text variant="caption" color="textMuted">
            No availability on this day. Try another date.
          </Text>
        ) : (
          <View style={styles.slotRow}>
            {slots.map((slot) => (
              <Chip
                key={slot.time}
                label={formatTimeLabel(slot.time)}
                selected={selectedSlot === slot.scheduledAt}
                disabled={!slot.available}
                onPress={() => setSelectedSlot(slot.scheduledAt)}
              />
            ))}
          </View>
        )}
      </View>

      {isHomeVisit ? (
        <View style={styles.section}>
          <Text variant="heading">Where should the doctor come?</Text>
          {addresses.length === 0 ? (
            <Banner
              tone="warning"
              title="No saved address yet"
              message="A home visit needs somewhere to go. Add one and you'll come straight back here."
              actionLabel="Add an address"
              onPressAction={() => router.push('/(patient)/address/new')}
            />
          ) : (
            addresses.map((address) => (
              <Card key={address.id} onPress={() => setAddressId(address.id)}>
                <View style={styles.addressRow}>
                  <View style={styles.addressBody}>
                    <Text variant="bodyStrong">{address.label}</Text>
                    <Text variant="caption" color="textMuted">
                      {address.address}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioDot,
                      {
                        borderColor:
                          addressId === address.id ? colors.primary : colors.borderStrong,
                        backgroundColor: addressId === address.id ? colors.primary : 'transparent',
                      },
                    ]}
                  />
                </View>
              </Card>
            ))
          )}
          <Button
            label={addresses.length > 0 ? 'Add another address' : 'Add an address'}
            variant="ghost"
            size="md"
            icon="add"
            onPress={() => router.push('/(patient)/address/new')}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardMeta: { marginTop: spacing.xs },
  section: { gap: spacing.md },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dateCell: {
    width: 56,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  addressBody: { flex: 1, gap: 2 },
  radioDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
});
