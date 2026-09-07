import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { Avatar, Button, Card, Chip, Text, TextField } from '@/components';
import { spacing } from '@/constants/theme';
import {
  inviteOrgMember,
  onboardingKeys,
  removeOrgMember,
  useOrgMembers,
} from '@/features/onboarding';
import { useTheme } from '@/hooks/useTheme';
import type { OrgMemberRole } from '@/types';

const INVITABLE_ROLES: { value: OrgMemberRole; label: string }[] = [
  { value: 'doctor', label: 'Doctor' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'staff', label: 'Other staff' },
];

export const ROLE_LABELS: Record<OrgMemberRole, string> = {
  owner: 'Owner',
  doctor: 'Doctor',
  receptionist: 'Receptionist',
  staff: 'Staff',
};

export interface StaffManagerProps {
  organizationId: string | null;
  onError?: (message: string | null) => void;
}

/** Team list + invite form, shared by the onboarding step and the dashboard. */
export function StaffManager({ organizationId, onError }: StaffManagerProps) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { data: members = [] } = useOrgMembers(organizationId ?? undefined);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [role, setRole] = useState<OrgMemberRole>('doctor');
  const [inviting, setInviting] = useState(false);

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  const refresh = async () => {
    if (organizationId) {
      await queryClient.invalidateQueries({ queryKey: onboardingKeys.members(organizationId) });
    }
  };

  const handleInvite = async () => {
    if (!organizationId || !emailValid) return;
    setInviting(true);
    onError?.(null);
    try {
      await inviteOrgMember(organizationId, {
        invited_email: email.trim().toLowerCase(),
        full_name: fullName.trim() || null,
        role_in_org: role,
        specialty: role === 'doctor' ? specialty.trim() || null : null,
      });
      await refresh();
      setEmail('');
      setFullName('');
      setSpecialty('');
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Could not send that invite.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    onError?.(null);
    try {
      await removeOrgMember(memberId);
      await refresh();
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Could not remove that member.');
    }
  };

  return (
    <>
      <View style={styles.section}>
        {members.map((member) => (
          <Card key={member.id}>
            <View style={styles.memberRow}>
              <Avatar name={member.full_name ?? member.invited_email} size={40} />
              <View style={styles.memberBody}>
                <Text variant="bodyStrong">
                  {member.full_name ?? member.invited_email ?? 'Team member'}
                </Text>
                <Text variant="caption" color="textMuted">
                  {ROLE_LABELS[member.role_in_org]}
                  {member.specialty ? ` · ${member.specialty}` : ''}
                  {member.profile_id ? '' : ' · invite pending'}
                </Text>
              </View>
              {member.role_in_org === 'owner' ? (
                <Text variant="caption" color="textMuted">
                  Owner
                </Text>
              ) : (
                <Pressable
                  onPress={() => void handleRemove(member.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Remove team member"
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              )}
            </View>
          </Card>
        ))}
      </View>

      <Card>
        <View style={styles.section}>
          <Text variant="heading">Invite someone</Text>
          <Text variant="caption" color="textMuted">
            They join this organization the first time they sign in with this Google address.
          </Text>

          <View style={styles.roleRow}>
            {INVITABLE_ROLES.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={role === option.value}
                onPress={() => setRole(option.value)}
              />
            ))}
          </View>

          <TextField
            label="Email address"
            required
            value={email}
            onChangeText={setEmail}
            placeholder="doctor@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={email.length > 0 && !emailValid ? 'Enter a valid email address' : undefined}
          />
          <TextField
            label="Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Dr. Rohan Iyer"
            autoCapitalize="words"
            hint="Optional"
          />
          {role === 'doctor' ? (
            <TextField
              label="Specialty"
              value={specialty}
              onChangeText={setSpecialty}
              placeholder="Cardiology"
              autoCapitalize="words"
              hint="Optional"
            />
          ) : null}

          <Button
            label="Send invite"
            variant="secondary"
            size="md"
            icon="person-add-outline"
            disabled={!emailValid}
            loading={inviting}
            onPress={() => void handleInvite()}
          />
        </View>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  memberBody: { flex: 1, gap: spacing.xs },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
