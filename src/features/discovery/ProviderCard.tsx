import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar, Card, Chip, Text } from '@/components';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { DiscoveryResult } from '@/types';

const ORG_TYPE_LABELS: Record<string, string> = {
  independent_doctor: 'Independent doctor',
  clinic: 'Clinic',
  hospital: 'Hospital',
};

export function ProviderCard({
  provider,
  onPress,
}: {
  provider: DiscoveryResult;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <Avatar uri={provider.logo_url} name={provider.name} size={52} />
        <View style={styles.body}>
          <Text variant="bodyStrong">{provider.name}</Text>
          <Text variant="caption" color="textMuted">
            {provider.specialty ?? ORG_TYPE_LABELS[provider.org_type] ?? provider.org_type}
          </Text>
          <View style={styles.metaRow}>
            {provider.distance_km != null ? (
              <View style={styles.meta}>
                <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                <Text variant="caption" color="textMuted">
                  {provider.distance_km.toFixed(1)} km
                </Text>
              </View>
            ) : null}
            {provider.avg_rating != null ? (
              <View style={styles.meta}>
                <Ionicons name="star" size={13} color={colors.warning} />
                <Text variant="caption" color="textMuted">
                  {provider.avg_rating.toFixed(1)} ({provider.review_count})
                </Text>
              </View>
            ) : null}
            {provider.min_price != null ? (
              <Text variant="caption" color="textMuted">
                from {provider.min_price}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
      <View style={styles.chips}>
        {provider.supports_clinic ? <Chip label="Clinic visit" /> : null}
        {provider.supports_home ? <Chip label="Home visit" /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  body: { flex: 1, gap: 2 },
  metaRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  chips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
});
