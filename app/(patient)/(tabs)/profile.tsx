import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Avatar, Banner, Button, Card, Screen, Text } from '@/components';
import { spacing } from '@/constants/theme';
import { usePatientAddresses } from '@/features/booking';
import { useTheme } from '@/hooks/useTheme';
import { signOut } from '@/lib/googleAuth';
import { useAuthStore } from '@/stores/authStore';

export default function PatientProfileScreen() {
  const { colors } = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const { data: addresses = [] } = usePatientAddresses();
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
      // The root layout's auth listener redirects to (auth).
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign out.');
      setSigningOut(false);
    }
  };

  return (
    <Screen scroll edges={{ top: true, bottom: true }}>
      <View style={styles.header}>
        <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={72} />
        <View style={styles.headerBody}>
          <Text variant="title">{profile?.full_name ?? 'Your profile'}</Text>
          <Text variant="caption" color="textMuted">
            {profile?.email}
          </Text>
          {profile?.phone ? (
            <Text variant="caption" color="textMuted">
              {profile.phone}
            </Text>
          ) : null}
        </View>
      </View>

      {error ? <Banner tone="danger" title="Something went wrong" message={error} /> : null}

      <Card>
        <View style={styles.sectionHeader}>
          <Ionicons name="home-outline" size={18} color={colors.primary} />
          <Text variant="heading">Saved addresses</Text>
        </View>
        {addresses.length === 0 ? (
          <Text variant="caption" color="textMuted" style={styles.sectionBody}>
            You have no saved addresses yet. You can add one while booking a home visit.
          </Text>
        ) : (
          <View style={styles.sectionBody}>
            {addresses.map((address) => (
              <View key={address.id} style={styles.addressRow}>
                <Text variant="bodyStrong">{address.label}</Text>
                <Text variant="caption" color="textMuted">
                  {address.address}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Button
        label="Sign out"
        variant="secondary"
        icon="log-out-outline"
        loading={signingOut}
        onPress={() => void handleSignOut()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingTop: spacing.md },
  headerBody: { flex: 1, gap: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionBody: { marginTop: spacing.md, gap: spacing.md },
  addressRow: { gap: 2 },
});
