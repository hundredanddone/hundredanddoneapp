import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Banner, Button, Card, Screen, StepProgress, Text } from '@/components';
import { spacing } from '@/constants/theme';
import { updateProfile } from '@/features/auth';
import { useLocation } from '@/hooks/useLocation';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/authStore';

/**
 * Last patient step. Location is genuinely optional — discovery falls back to a
 * manually entered address — so the screen offers both "allow" and "skip".
 */
export default function PatientLocationScreen() {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);
  const setProfile = useAuthStore((s) => s.setProfile);
  const { request, address, status } = useLocation();

  const [finishing, setFinishing] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    if (!session) return;
    setFinishing(true);
    setError(null);
    try {
      const updated = await updateProfile(session.user.id, { onboarding_completed: true });
      setProfile(updated);
      router.replace('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish setting up your account.');
      setFinishing(false);
    }
  };

  const allowLocation = async () => {
    setRequesting(true);
    await request();
    setRequesting(false);
  };

  return (
    <Screen
      scroll
      edges={{ top: true, bottom: true }}
      footer={
        <View style={styles.footer}>
          <Button label="Finish setup" onPress={() => void finish()} loading={finishing} />
          <Button
            label="Skip for now"
            variant="ghost"
            size="md"
            onPress={() => void finish()}
            disabled={finishing}
          />
        </View>
      }
    >
      <StepProgress
        current={2}
        total={2}
        title="Find care near you"
        subtitle="We use your location to show nearby doctors and to suggest an address for home visits."
      />

      {error ? <Banner tone="danger" title="Could not finish" message={error} /> : null}

      <Card>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="navigate" size={22} color={colors.primary} />
          </View>
          <View style={styles.rowBody}>
            <Text variant="bodyStrong">Location access</Text>
            <Text variant="caption" color="textMuted">
              {status === 'granted' && address
                ? address
                : status === 'denied'
                  ? 'Permission denied — you can still search by typing an address.'
                  : 'Used only while you are using the app.'}
            </Text>
          </View>
        </View>
        <View style={styles.cardAction}>
          <Button
            label={status === 'granted' ? 'Location enabled' : 'Allow location'}
            variant="secondary"
            size="md"
            icon={status === 'granted' ? 'checkmark' : 'locate'}
            loading={requesting}
            disabled={status === 'granted'}
            onPress={() => void allowLocation()}
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  rowBody: { flex: 1, gap: spacing.xs },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardAction: { marginTop: spacing.lg },
});
