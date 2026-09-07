import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import { Avatar, Banner, Button, Card, LoadingScreen, Screen, Text, TextField } from '@/components';
import { spacing } from '@/constants/theme';
import {
  STATUS_LABELS,
  nextStatuses,
  useAppointment,
  useUpdateAppointmentStatus,
} from '@/features/appointments';
import { StatusBadge } from '@/features/appointments/StatusBadge';
import { useCreatePatientRecord } from '@/features/patient-records';
import { useTheme } from '@/hooks/useTheme';
import { dayjs } from '@/lib/time';
import { useAuthStore } from '@/stores/authStore';
import type { RecordType } from '@/types';

export default function OrgAppointmentDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const authorId = useAuthStore((s) => s.session?.user.id ?? null);
  const { data: appointment, isPending } = useAppointment(id);
  const updateStatus = useUpdateAppointmentStatus();
  const createRecord = useCreatePatientRecord();

  const [notes, setNotes] = useState('');
  const [recordType, setRecordType] = useState<RecordType>('consultation_note');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (isPending) return <LoadingScreen />;
  if (!appointment) {
    return (
      <Screen>
        <Banner tone="danger" title="Appointment not found" />
      </Screen>
    );
  }

  const when = dayjs(appointment.scheduled_at);
  const transitions = nextStatuses(appointment.status, appointment.visit_type);

  const handleTransition = async (status: (typeof transitions)[number]) => {
    setError(null);
    try {
      await updateStatus.mutateAsync({ id: appointment.id, status });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update this appointment.');
    }
  };

  const handleAddRecord = async () => {
    if (!authorId || notes.trim().length === 0) return;
    setError(null);
    setSaved(false);
    try {
      await createRecord.mutateAsync({
        patientId: appointment.patient_id,
        createdByProfileId: authorId,
        organizationId: appointment.organization_id,
        appointmentId: appointment.id,
        recordType,
        notes: notes.trim(),
      });
      setNotes('');
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that record.');
    }
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Avatar
          uri={appointment.profiles?.avatar_url}
          name={appointment.profiles?.full_name}
          size={56}
        />
        <View style={styles.headerBody}>
          <Text variant="title">{appointment.profiles?.full_name ?? 'Patient'}</Text>
          {appointment.profiles?.phone ? (
            <Text variant="caption" color="textMuted">
              {appointment.profiles.phone}
            </Text>
          ) : null}
        </View>
      </View>

      <StatusBadge status={appointment.status} />

      {error ? <Banner tone="danger" title="Something went wrong" message={error} /> : null}

      <Card>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <View style={styles.detailBody}>
            <Text variant="bodyStrong">{when.format('dddd, D MMMM YYYY · h:mm A')}</Text>
            <Text variant="caption" color="textMuted">
              {appointment.service_offerings?.services?.name ?? 'Appointment'} ·{' '}
              {appointment.service_offerings?.duration_minutes ?? 0} min
            </Text>
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.detailRow}>
          <Ionicons
            name={appointment.visit_type === 'home' ? 'home-outline' : 'business-outline'}
            size={18}
            color={colors.primary}
          />
          <View style={styles.detailBody}>
            <Text variant="bodyStrong">
              {appointment.visit_type === 'home' ? 'Home visit' : 'Clinic visit'}
            </Text>
            <Text variant="caption" color="textMuted">
              {appointment.visit_type === 'home'
                ? (appointment.patient_addresses?.address ?? 'Address not provided')
                : 'Patient comes to you'}
            </Text>
          </View>
        </View>
      </Card>

      {transitions.length > 0 ? (
        <View style={styles.section}>
          <Text variant="heading">Update status</Text>
          {transitions.map((status) => (
            <Button
              key={status}
              label={STATUS_LABELS[status]}
              variant={status === 'cancelled' || status === 'no_show' ? 'secondary' : 'primary'}
              size="md"
              loading={updateStatus.isPending}
              onPress={() => void handleTransition(status)}
            />
          ))}
        </View>
      ) : null}

      <Card>
        <View style={styles.section}>
          <Text variant="heading">Add to patient record</Text>
          <View style={styles.typeRow}>
            {(['consultation_note', 'prescription'] as RecordType[]).map((type) => (
              <Button
                key={type}
                label={type === 'prescription' ? 'Prescription' : 'Consultation note'}
                variant={recordType === type ? 'primary' : 'secondary'}
                size="md"
                fullWidth={false}
                onPress={() => setRecordType(type)}
              />
            ))}
          </View>
          <TextField
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Findings, prescription details, follow-up advice…"
            multiline
          />
          {saved ? (
            <Banner
              tone="success"
              title="Saved"
              message="The patient can see this in their records."
            />
          ) : null}
          <Button
            label="Save to record"
            variant="secondary"
            size="md"
            icon="save-outline"
            disabled={notes.trim().length === 0}
            loading={createRecord.isPending}
            onPress={() => void handleAddRecord()}
          />
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
  section: { gap: spacing.md },
  typeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
