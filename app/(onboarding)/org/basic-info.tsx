import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { Avatar, Text, TextField } from '@/components';
import { spacing } from '@/constants/theme';
import {
  onboardingKeys,
  updateOrganization,
  useAdvanceStep,
  useMyOrganization,
} from '@/features/onboarding';
import { OrgStepShell } from '@/features/onboarding/OrgStepShell';
import { useTheme } from '@/hooks/useTheme';
import { pickImage } from '@/hooks/usePickedFile';
import { BUCKETS, uploadToStorage } from '@/lib/uploads';
import { useAuthStore } from '@/stores/authStore';
import type { Organization } from '@/types';

interface BasicInfoDraft {
  name: string;
  specialty: string;
  bio: string;
  logoUrl: string | null;
}

/**
 * The saved row is the form's baseline; local edits live in `draft` and win once the
 * user touches anything. Deriving instead of syncing means a background refetch can
 * never overwrite what is being typed, and there is no hydration effect to get wrong.
 */
function savedValues(organization: Organization | null | undefined): BasicInfoDraft {
  return {
    name: organization?.name ?? '',
    specialty: organization?.specialty ?? '',
    bio: organization?.bio ?? '',
    logoUrl: organization?.logo_url ?? null,
  };
}

export default function OrgBasicInfoScreen() {
  const { colors } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const queryClient = useQueryClient();
  const advance = useAdvanceStep();
  const { data: organization } = useMyOrganization();

  const [draft, setDraft] = useState<BasicInfoDraft | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const values = draft ?? savedValues(organization);
  const update = (patch: Partial<BasicInfoDraft>) => setDraft({ ...values, ...patch });

  const isDoctor = organization?.org_type === 'independent_doctor';

  const handlePickLogo = async () => {
    if (!organization) return;
    setError(null);
    const file = await pickImage();
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadToStorage(BUCKETS.orgLogos, organization.id, file.uri, {
        contentType: file.mimeType,
        fileName: file.name,
      });
      update({ logoUrl: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload that image.');
    } finally {
      setUploading(false);
    }
  };

  const handleNext = async (org: Organization) => {
    setSaving(true);
    setError(null);
    try {
      await updateOrganization(org.id, {
        name: values.name.trim(),
        specialty: values.specialty.trim() || null,
        bio: values.bio.trim() || null,
        logo_url: values.logoUrl,
      });
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: onboardingKeys.organization(userId) });
      }
      await advance({ organizationId: org.id, currentStep: 'basic_info', orgType: org.org_type });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OrgStepShell
      stepKey="basic_info"
      onNext={(org) => void handleNext(org)}
      nextDisabled={values.name.trim().length < 2}
      saving={saving}
      error={error}
    >
      <View style={styles.form}>
        <View style={styles.logoRow}>
          <Avatar uri={values.logoUrl} name={values.name} size={72} />
          <Pressable
            accessibilityRole="button"
            onPress={() => void handlePickLogo()}
            disabled={uploading}
            style={styles.logoAction}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
            <Text variant="bodyStrong" color="primary">
              {uploading ? 'Uploading…' : values.logoUrl ? 'Change photo' : 'Add photo or logo'}
            </Text>
          </Pressable>
        </View>

        <TextField
          label={isDoctor ? 'Your display name' : 'Organization name'}
          required
          value={values.name}
          onChangeText={(name) => update({ name })}
          placeholder={isDoctor ? 'Dr. Asha Menon' : 'Sunrise Multispeciality Clinic'}
          autoCapitalize="words"
        />

        {isDoctor ? (
          <TextField
            label="Specialty"
            value={values.specialty}
            onChangeText={(specialty) => update({ specialty })}
            placeholder="General physician, Paediatrics, Dermatology…"
            autoCapitalize="words"
          />
        ) : null}

        <TextField
          label="Short description"
          value={values.bio}
          onChangeText={(bio) => update({ bio })}
          placeholder="What patients should know about you — experience, focus areas, languages."
          multiline
          hint="Shown on your public profile."
        />
      </View>
    </OrgStepShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  logoAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
