import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Banner, Button, Screen, SelectableCard, Text } from '@/components';
import { spacing } from '@/constants/theme';
import { updateProfile } from '@/features/auth';
import { signOut } from '@/lib/googleAuth';
import { useAuthStore } from '@/stores/authStore';
import type { AccountRole } from '@/types';

/** Step 1 for every new user. Sets `profiles.role`, which decides the whole app shape. */
export default function AccountTypeScreen() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  const [selected, setSelected] = useState<AccountRole | null>(profile?.role ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
      // The root layout's auth listener routes back to (auth).
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign out.');
      setSigningOut(false);
    }
  };

  const handleContinue = async () => {
    if (!selected || !session) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile(session.user.id, { role: selected });
      setProfile(updated);
      router.push(selected === 'patient' ? '/patient/profile' : '/org/org-type');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your choice.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      scroll
      edges={{ top: true, bottom: true }}
      footer={
        <View style={styles.footer}>
          <Button
            label="Continue"
            onPress={() => void handleContinue()}
            disabled={!selected}
            loading={saving}
          />
          <Button
            label="Use a different account"
            variant="ghost"
            size="md"
            disabled={saving || signingOut}
            loading={signingOut}
            onPress={() => void handleSignOut()}
          />
        </View>
      }
    >
      <View style={styles.header}>
        <Text variant="display">Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}</Text>
        <Text variant="body" color="textMuted">
          Are you here as a patient, or as a doctor, clinic or hospital?
        </Text>
      </View>

      {error ? <Banner tone="danger" title="Something went wrong" message={error} /> : null}

      <View style={styles.options}>
        <SelectableCard
          testID="account-type-patient"
          title="Patient"
          description="Find doctors near you, book clinic or home visits, and keep your records in one place."
          icon="person-outline"
          selected={selected === 'patient'}
          onPress={() => setSelected('patient')}
        />
        <SelectableCard
          testID="account-type-org"
          title="Doctor / Clinic / Hospital"
          description="Publish your availability, take bookings, and manage your team. Independent doctors sign up here too."
          icon="medkit-outline"
          selected={selected === 'org'}
          onPress={() => setSelected('org')}
        />
      </View>

      <Text variant="caption" color="textMuted">
        You can only pick one account type per Google account. Contact support if you need to change
        it later.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, paddingTop: spacing.xl },
  options: { gap: spacing.md },
  footer: { gap: spacing.xs },
});
