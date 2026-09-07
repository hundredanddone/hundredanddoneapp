import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Avatar, Card, Text } from '@/components';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { dayjs } from '@/lib/time';

import type { AppointmentWithRelations } from './api';
import { StatusBadge } from './StatusBadge';

export interface AppointmentCardProps {
  appointment: AppointmentWithRelations;
  /** Whose side of the appointment we are showing. */
  perspective: 'patient' | 'org';
  onPress: () => void;
}

export function AppointmentCard({ appointment, perspective, onPress }: AppointmentCardProps) {
  const { colors } = useTheme();

  const counterpartName =
    perspective === 'patient'
      ? (appointment.organizations?.name ?? 'Provider')
      : (appointment.profiles?.full_name ?? 'Patient');
  const avatarUri = perspective === 'patient' ? appointment.organizations?.logo_url : null;
  const serviceName = appointment.service_offerings?.services?.name ?? 'Appointment';
  const when = dayjs(appointment.scheduled_at);

  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <Avatar uri={avatarUri} name={counterpartName} size={44} />
        <View style={styles.body}>
          <Text variant="bodyStrong">{counterpartName}</Text>
          <Text variant="caption" color="textMuted">
            {serviceName}
          </Text>
        </View>
        <StatusBadge status={appointment.status} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.meta}>
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text variant="caption" color="textMuted">
            {when.format('ddd, D MMM · h:mm A')}
          </Text>
        </View>
        <View style={styles.meta}>
          <Ionicons
            name={appointment.visit_type === 'home' ? 'home-outline' : 'business-outline'}
            size={14}
            color={colors.textMuted}
          />
          <Text variant="caption" color="textMuted">
            {appointment.visit_type === 'home' ? 'Home visit' : 'Clinic visit'}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: 2 },
  metaRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
