import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { Banner, Button, Card, Text } from '@/components';
import { spacing } from '@/constants/theme';
import { updateProfile } from '@/features/auth';
import {
  addVerificationDocument,
  completeOrgOnboarding,
  onboardingKeys,
  useMyOrganization,
  useOrgVerificationDocuments,
} from '@/features/onboarding';
import { OrgStepShell } from '@/features/onboarding/OrgStepShell';
import { useTheme } from '@/hooks/useTheme';
import { pickDocument } from '@/hooks/usePickedFile';
import { BUCKETS, uploadToStorage } from '@/lib/uploads';
import { useAuthStore } from '@/stores/authStore';
import type { Organization, VerificationDocType } from '@/types';

const DOC_TYPES: { value: VerificationDocType; label: string; hint: string }[] = [
  {
    value: 'medical_license',
    label: 'Medical licence',
    hint: 'Registration certificate for the practising doctor.',
  },
  {
    value: 'business_registration',
    label: 'Business registration',
    hint: 'Clinic or hospital registration / incorporation document.',
  },
  { value: 'other', label: 'Other document', hint: 'Anything else that supports your listing.' },
];

export default function OrgVerificationScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const setProfile = useAuthStore((s) => s.setProfile);
  const { data: organization } = useMyOrganization();
  const { data: documents = [] } = useOrgVerificationDocuments(organization?.id);

  const [uploading, setUploading] = useState<VerificationDocType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (docType: VerificationDocType) => {
    if (!organization) return;
    setError(null);
    const file = await pickDocument();
    if (!file) return;

    setUploading(docType);
    try {
      // Private bucket: we store the path, and read it back through a signed URL.
      const { path } = await uploadToStorage(BUCKETS.verificationDocs, organization.id, file.uri, {
        contentType: file.mimeType,
        fileName: file.name,
      });
      await addVerificationDocument(organization.id, docType, path);
      await queryClient.invalidateQueries({ queryKey: onboardingKeys.documents(organization.id) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload that document.');
    } finally {
      setUploading(null);
    }
  };

  const handleFinish = async (org: Organization) => {
    if (!session) return;
    setSubmitting(true);
    setError(null);
    try {
      await completeOrgOnboarding(session.user.id, org.id);
      // Re-read the profile so the root layout's guard flips to the (org) group.
      const updated = await updateProfile(session.user.id, { onboarding_completed: true });
      setProfile(updated);
      router.replace('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit for verification.');
      setSubmitting(false);
    }
  };

  const countFor = (docType: VerificationDocType) =>
    documents.filter((doc) => doc.doc_type === docType).length;

  return (
    <OrgStepShell
      stepKey="verification"
      onNext={(org) => void handleFinish(org)}
      nextLabel="Submit and finish setup"
      nextDisabled={documents.length === 0}
      saving={submitting}
      error={error}
    >
      <Banner
        tone="info"
        title="Why we ask"
        message="We verify every practice before it appears in search. Your documents are private — patients never see them."
      />

      <View style={styles.section}>
        {DOC_TYPES.map((docType) => {
          const count = countFor(docType.value);
          return (
            <Card key={docType.value}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons
                    name={count > 0 ? 'checkmark-circle' : 'document-text-outline'}
                    size={22}
                    color={count > 0 ? colors.success : colors.primary}
                  />
                </View>
                <View style={styles.body}>
                  <Text variant="bodyStrong">{docType.label}</Text>
                  <Text variant="caption" color="textMuted">
                    {count > 0 ? `${count} file(s) uploaded` : docType.hint}
                  </Text>
                </View>
              </View>
              <View style={styles.action}>
                <Button
                  label={count > 0 ? 'Upload another' : 'Upload'}
                  variant="secondary"
                  size="md"
                  icon="cloud-upload-outline"
                  loading={uploading === docType.value}
                  disabled={uploading !== null}
                  onPress={() => void handleUpload(docType.value)}
                />
              </View>
            </Card>
          );
        })}
      </View>

      <Text variant="caption" color="textMuted">
        After you submit, your profile stays in &quot;pending verification&quot; until an admin
        approves it. You can use the dashboard in the meantime.
      </Text>
    </OrgStepShell>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: spacing.xs },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  action: { marginTop: spacing.md },
});
