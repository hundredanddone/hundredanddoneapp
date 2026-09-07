import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Banner, Button, Card, EmptyState, LoadingScreen, Screen, Text } from '@/components';
import { spacing } from '@/constants/theme';
import {
  RECORD_TYPE_LABELS,
  useCreatePatientRecord,
  usePatientRecords,
} from '@/features/patient-records';
import { useTheme } from '@/hooks/useTheme';
import { pickDocument } from '@/hooks/usePickedFile';
import { dayjs } from '@/lib/time';
import { BUCKETS, uploadToStorage } from '@/lib/uploads';
import { useAuthStore } from '@/stores/authStore';

export default function PatientRecordsScreen() {
  const { colors } = useTheme();
  const patientId = useAuthStore((s) => s.session?.user.id ?? null);
  const { data: records = [], isPending } = usePatientRecords();
  const createRecord = useCreatePatientRecord();

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!patientId) return;
    setError(null);
    const file = await pickDocument();
    if (!file) return;

    setUploading(true);
    try {
      const { path } = await uploadToStorage(BUCKETS.patientRecords, patientId, file.uri, {
        contentType: file.mimeType,
        fileName: file.name,
      });
      await createRecord.mutateAsync({
        patientId,
        createdByProfileId: patientId,
        recordType: 'document',
        fileUrl: path,
        notes: file.name,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload that file.');
    } finally {
      setUploading(false);
    }
  };

  if (isPending) return <LoadingScreen />;

  return (
    <Screen padded={false} edges={{ top: true, bottom: false }}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="display">Records</Text>
            <Text variant="body" color="textMuted">
              Prescriptions and notes your providers add, plus anything you upload yourself.
            </Text>
            {error ? <Banner tone="danger" title="Upload failed" message={error} /> : null}
            <Button
              label="Upload a document"
              icon="cloud-upload-outline"
              variant="secondary"
              size="md"
              loading={uploading}
              onPress={() => void handleUpload()}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="folder-open-outline"
            title="No records yet"
            message="Once you complete a visit, prescriptions and notes appear here."
          />
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.body}>
                <Text variant="bodyStrong">{RECORD_TYPE_LABELS[item.record_type]}</Text>
                {item.notes ? (
                  <Text variant="caption" color="textMuted">
                    {item.notes}
                  </Text>
                ) : null}
                <Text variant="caption" color="textMuted">
                  {item.organizations?.name ? `${item.organizations.name} · ` : ''}
                  {dayjs(item.created_at).format('D MMM YYYY')}
                </Text>
              </View>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  header: { gap: spacing.md, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  body: { flex: 1, gap: 2 },
  icon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
