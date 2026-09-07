import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';

import {
  Avatar,
  Banner,
  Button,
  Card,
  EmptyState,
  LoadingScreen,
  Screen,
  Text,
  VisitTypeToggle,
} from '@/components';
import { spacing } from '@/constants/theme';
import { useProviderProfile } from '@/features/discovery';
import { useTheme } from '@/hooks/useTheme';
import { usePreferencesStore } from '@/stores/preferencesStore';
import type { VisitType } from '@/types';

export default function ProviderProfileScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const visitType = usePreferencesStore((s) => s.visitType);
  const setVisitType = usePreferencesStore((s) => s.setVisitType);

  const { data, isPending, error } = useProviderProfile(id);

  const availableTypes = useMemo<VisitType[]>(() => {
    const types = new Set<VisitType>();
    for (const service of data?.services ?? []) {
      for (const offering of service.service_offerings) {
        if (offering.is_active) types.add(offering.visit_type);
      }
    }
    return [...types];
  }, [data]);

  if (isPending) return <LoadingScreen />;
  if (error || !data) {
    return (
      <Screen>
        <Banner
          tone="danger"
          title="Could not load this provider"
          message={error instanceof Error ? error.message : 'Please try again.'}
        />
      </Screen>
    );
  }

  const { organization, branches, rating, services } = data;
  const primaryBranch = branches.find((branch) => branch.is_primary) ?? branches[0];
  const offeringsForType = services
    .map((service) => ({
      service,
      offering: service.service_offerings.find(
        (item) => item.visit_type === visitType && item.is_active,
      ),
    }))
    .filter((entry) => entry.offering);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Avatar uri={organization.logo_url} name={organization.name} size={64} />
        <View style={styles.headerBody}>
          <Text variant="title">{organization.name}</Text>
          {organization.specialty ? (
            <Text variant="caption" color="textMuted">
              {organization.specialty}
            </Text>
          ) : null}
          {rating.average != null ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={colors.warning} />
              <Text variant="caption" color="textMuted">
                {rating.average.toFixed(1)} · {rating.count} reviews
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {organization.verification_status !== 'verified' ? (
        <Banner
          tone="warning"
          title="Not verified yet"
          message="This provider has not completed verification. Book with care."
        />
      ) : null}

      {organization.bio ? <Text variant="body">{organization.bio}</Text> : null}

      {primaryBranch ? (
        <Card>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <View style={styles.rowBody}>
              <Text variant="bodyStrong">{primaryBranch.name}</Text>
              <Text variant="caption" color="textMuted">
                {primaryBranch.address ?? 'Address not provided'}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      <View style={styles.section}>
        <Text variant="heading">Book a visit</Text>
        <VisitTypeToggle
          value={visitType}
          onChange={setVisitType}
          availableTypes={availableTypes.length > 0 ? availableTypes : ['clinic']}
        />
      </View>

      {offeringsForType.length === 0 ? (
        <EmptyState
          icon="pricetags-outline"
          title="Nothing to book for this visit type"
          message={
            visitType === 'home'
              ? 'This provider does not offer home visits yet.'
              : 'This provider has not published clinic services yet.'
          }
        />
      ) : (
        offeringsForType.map(({ service, offering }) => (
          <Card key={service.id}>
            <View style={styles.serviceRow}>
              <View style={styles.rowBody}>
                <Text variant="bodyStrong">{service.name}</Text>
                {service.description ? (
                  <Text variant="caption" color="textMuted">
                    {service.description}
                  </Text>
                ) : null}
                <Text variant="caption" color="textMuted">
                  {offering?.duration_minutes} min · {offering?.price}
                </Text>
              </View>
              <Button
                label="Book"
                size="md"
                fullWidth={false}
                onPress={() => router.push(`/booking/${offering?.id}`)}
              />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  headerBody: { flex: 1, gap: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  rowBody: { flex: 1, gap: 2 },
  section: { gap: spacing.md },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
