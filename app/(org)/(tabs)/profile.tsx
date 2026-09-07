import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';

import { Avatar, Banner, Button, Card, LoadingScreen, Screen, Text } from '@/components';
import { spacing } from '@/constants/theme';
import { useActiveOrganization } from '@/features/org-setup';
import { useTheme } from '@/hooks/useTheme';
import { signOut } from '@/lib/googleAuth';
import { useAuthStore } from '@/stores/authStore';
import { useOrgContextStore } from '@/stores/orgContextStore';
import type { VerificationStatus } from '@/types';

const VERIFICATION_COPY: Record<
  VerificationStatus,
  { tone: 'warning' | 'success' | 'danger'; title: string }
> = {
  pending: { tone: 'warning', title: 'Pending verification' },
  verified: { tone: 'success', title: 'Verified' },
  rejected: { tone: 'danger', title: 'Verification rejected' },
};

const LINKS: {
  label: string;
  icon: 'pricetags-outline' | 'business-outline' | 'people-outline';
  href: Href;
}[] = [
  { label: 'Services and pricing', icon: 'pricetags-outline', href: '/setup/services' },
  { label: 'Branches', icon: 'business-outline', href: '/setup/branches' },
  { label: 'Team', icon: 'people-outline', href: '/setup/staff' },
];

export default function OrgProfileScreen() {
  const { colors } = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const { organization, memberships, isPending } = useActiveOrganization();
  const setActiveOrganizationId = useOrgContextStore((s) => s.setActiveOrganizationId);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign out.');
      setSigningOut(false);
    }
  };

  if (isPending) return <LoadingScreen />;

  const verification = organization ? VERIFICATION_COPY[organization.verification_status] : null;

  return (
    <Screen scroll edges={{ top: true, bottom: true }}>
      <View style={styles.header}>
        <Avatar uri={organization?.logo_url} name={organization?.name} size={72} />
        <View style={styles.headerBody}>
          <Text variant="title">{organization?.name ?? 'Your practice'}</Text>
          <Text variant="caption" color="textMuted">
            {organization?.specialty ?? organization?.org_type.replace('_', ' ')}
          </Text>
          <Text variant="caption" color="textMuted">
            Signed in as {profile?.email}
          </Text>
        </View>
      </View>

      {error ? <Banner tone="danger" title="Something went wrong" message={error} /> : null}

      {verification && organization ? (
        <Banner
          tone={verification.tone}
          title={verification.title}
          message={
            organization.verification_status === 'verified'
              ? 'Your practice is live and visible to patients.'
              : 'Patients cannot find you in search until an admin approves your documents.'
          }
        />
      ) : null}

      <View style={styles.section}>
        {LINKS.map((link) => (
          <Card key={link.label} onPress={() => router.push(link.href)}>
            <View style={styles.linkRow}>
              <Ionicons name={link.icon} size={20} color={colors.primary} />
              <Text variant="bodyStrong" style={styles.linkLabel}>
                {link.label}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Card>
        ))}
      </View>

      {memberships.length > 1 ? (
        <View style={styles.section}>
          <Text variant="heading">Switch organization</Text>
          {memberships.map((membership) => (
            <Card
              key={membership.id}
              onPress={() => setActiveOrganizationId(membership.organization_id)}
            >
              <Text variant="bodyStrong">{membership.organizations?.name ?? 'Organization'}</Text>
              <Text variant="caption" color="textMuted">
                {membership.role_in_org}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}

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
  section: { gap: spacing.md },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  linkLabel: { flex: 1 },
});
