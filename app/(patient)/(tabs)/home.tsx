import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

import { Banner, Chip, EmptyState, Screen, Text, TextField, VisitTypeToggle } from '@/components';
import { spacing } from '@/constants/theme';
import { ProviderCard } from '@/features/discovery/ProviderCard';
import { useDiscovery } from '@/features/discovery';
import { useLocation } from '@/hooks/useLocation';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/authStore';
import { usePreferencesStore } from '@/stores/preferencesStore';

const RADIUS_CHOICES = [3, 5, 10, 25, 50];

export default function PatientHomeScreen() {
  const { colors } = useTheme();
  const fullName = useAuthStore((s) => s.profile?.full_name ?? null);
  const visitType = usePreferencesStore((s) => s.visitType);
  const setVisitType = usePreferencesStore((s) => s.setVisitType);
  const radiusKm = usePreferencesStore((s) => s.searchRadiusKm);
  const setRadiusKm = usePreferencesStore((s) => s.setSearchRadiusKm);

  const { coords, address, status, request } = useLocation();
  const [search, setSearch] = useState('');

  // Ask once on mount; the user can retry from the banner if they declined.
  useEffect(() => {
    if (status === 'idle') void request();
  }, [request, status]);

  const {
    data: providers = [],
    isFetching,
    refetch,
    error,
  } = useDiscovery(coords, radiusKm, visitType, search);

  const greeting = useMemo(
    () => (fullName ? `Hello, ${fullName.split(' ')[0]}` : 'Hello'),
    [fullName],
  );

  return (
    <Screen padded={false} edges={{ top: true, bottom: false }}>
      <FlatList
        data={providers}
        keyExtractor={(item) => item.organization_id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text variant="display">{greeting}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text variant="caption" color="textMuted" numberOfLines={1}>
                  {address ?? (coords ? 'Near your current location' : 'Location not set')}
                </Text>
              </View>
            </View>

            <VisitTypeToggle value={visitType} onChange={setVisitType} />

            <TextField
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or specialty"
              autoCorrect={false}
              returnKeyType="search"
            />

            <View style={styles.radiusRow}>
              {RADIUS_CHOICES.map((km) => (
                <Chip
                  key={km}
                  label={`${km} km`}
                  selected={radiusKm === km}
                  onPress={() => setRadiusKm(km)}
                />
              ))}
            </View>

            {status === 'denied' || status === 'error' ? (
              <Banner
                tone="warning"
                title="We can't see your location"
                message="Turn on location to sort providers by distance."
                actionLabel="Try again"
                onPressAction={() => void request()}
              />
            ) : null}

            {error ? (
              <Banner
                tone="danger"
                title="Could not load providers"
                message={error instanceof Error ? error.message : 'Please try again.'}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          coords ? (
            <EmptyState
              icon="search-outline"
              title="No providers found"
              message={
                visitType === 'home'
                  ? 'No one nearby offers home visits in this radius yet. Try a wider radius or switch to clinic visits.'
                  : 'Try widening your search radius or clearing the search box.'
              }
            />
          ) : (
            <EmptyState
              icon="navigate-outline"
              title="Set your location"
              message="We need your location to find providers near you."
              actionLabel="Use my location"
              onPressAction={() => void request()}
            />
          )
        }
        renderItem={({ item }) => (
          <ProviderCard
            provider={item}
            onPress={() => router.push(`/provider/${item.organization_id}`)}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  header: { gap: spacing.md, paddingBottom: spacing.sm },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  radiusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
