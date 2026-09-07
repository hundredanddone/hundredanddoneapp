import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';

import { Banner, Card, LoadingScreen, Screen, Text } from '@/components';
import { spacing } from '@/constants/theme';
import { AppointmentCard } from '@/features/appointments/AppointmentCard';
import { useOrgAppointments } from '@/features/appointments';
import { stepByKey, type OrgStepKey } from '@/features/onboarding';
import { useActiveOrganization } from '@/features/org-setup';
import { useTheme } from '@/hooks/useTheme';
import { dayjs } from '@/lib/time';

const QUICK_LINKS: {
  label: string;
  icon: 'pricetags' | 'business' | 'people' | 'time';
  href: Href;
}[] = [
  { label: 'Services', icon: 'pricetags', href: '/setup/services' },
  { label: 'Branches', icon: 'business', href: '/setup/branches' },
  { label: 'Team', icon: 'people', href: '/setup/staff' },
  { label: 'Availability', icon: 'time', href: '/availability' },
];

export default function OrgDashboardScreen() {
  const { colors } = useTheme();
  const { organization, organizationId, isPending } = useActiveOrganization();
  const today = dayjs().format('YYYY-MM-DD');
  const { data: todaysAppointments = [] } = useOrgAppointments(organizationId, { date: today });

  if (isPending) return <LoadingScreen />;

  const pendingStep = organization?.onboarding_step
    ? stepByKey(organization.onboarding_step as OrgStepKey)
    : null;
  const confirmedCount = todaysAppointments.filter((a) =>
    ['confirmed', 'en_route', 'in_progress'].includes(a.status),
  ).length;
  const awaitingCount = todaysAppointments.filter((a) => a.status === 'pending').length;

  return (
    <Screen scroll edges={{ top: true, bottom: true }}>
      <View>
        <Text variant="display">{organization?.name ?? 'Your practice'}</Text>
        <Text variant="caption" color="textMuted">
          {dayjs().format('dddd, D MMMM')}
        </Text>
      </View>

      {organization?.verification_status === 'pending' ? (
        <Banner
          tone="warning"
          title="Pending verification"
          message="An admin is reviewing your documents. Patients can't find you in search until this is approved."
        />
      ) : null}

      {organization?.verification_status === 'rejected' ? (
        <Banner
          tone="danger"
          title="Verification was rejected"
          message="Please re-upload valid documents from your profile, or contact support."
        />
      ) : null}

      {pendingStep ? (
        <Banner
          tone="info"
          title="Complete your setup"
          message={`Next up: ${pendingStep.title}`}
          actionLabel="Continue setup"
          onPressAction={() => router.push(pendingStep.route as Href)}
        />
      ) : null}

      <View style={styles.statRow}>
        <Card style={styles.statCard}>
          <Text variant="display">{todaysAppointments.length}</Text>
          <Text variant="caption" color="textMuted">
            Today
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text variant="display">{confirmedCount}</Text>
          <Text variant="caption" color="textMuted">
            Confirmed
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text variant="display">{awaitingCount}</Text>
          <Text variant="caption" color="textMuted">
            Awaiting you
          </Text>
        </Card>
      </View>

      <View style={styles.quickLinks}>
        {QUICK_LINKS.map((link) => (
          <Card key={link.label} style={styles.quickCard} onPress={() => router.push(link.href)}>
            <Ionicons name={link.icon} size={22} color={colors.primary} />
            <Text variant="bodyStrong">{link.label}</Text>
          </Card>
        ))}
      </View>

      <View style={styles.section}>
        <Text variant="heading">Today&apos;s schedule</Text>
        {todaysAppointments.length === 0 ? (
          <Text variant="caption" color="textMuted">
            Nothing booked for today.
          </Text>
        ) : (
          todaysAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              perspective="org"
              onPress={() => router.push(`/appointment/${appointment.id}`)}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, alignItems: 'center', gap: spacing.xs },
  quickLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  quickCard: { flexGrow: 1, flexBasis: '45%', alignItems: 'center', gap: spacing.sm },
  section: { gap: spacing.md },
});
