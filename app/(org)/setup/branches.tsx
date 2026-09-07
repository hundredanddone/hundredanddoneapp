import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';

import {
  AddressMapPicker,
  Banner,
  Button,
  Card,
  LoadingScreen,
  Screen,
  Text,
  TextField,
} from '@/components';
import { spacing } from '@/constants/theme';
import {
  createBranch,
  deleteBranch,
  orgSetupKeys,
  useActiveOrganization,
  useOrgBranches,
} from '@/features/org-setup';
import { useTheme } from '@/hooks/useTheme';
import type { LatLng } from '@/types';

export default function OrgBranchesScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { organizationId, organization, isPending } = useActiveOrganization();
  const { data: branches = [] } = useOrgBranches(organizationId);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (organizationId) {
      await queryClient.invalidateQueries({ queryKey: orgSetupKeys.branches(organizationId) });
    }
  };

  const handleAdd = async () => {
    if (!organizationId) return;
    setSaving(true);
    setError(null);
    try {
      await createBranch(organizationId, {
        name: name.trim(),
        address: address.trim(),
        coords,
        isPrimary: branches.length === 0,
      });
      await refresh();
      setName('');
      setAddress('');
      setCoords(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add that branch.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branchId: string) => {
    setError(null);
    try {
      await deleteBranch(branchId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove that branch.');
    }
  };

  if (isPending) return <LoadingScreen />;

  return (
    <Screen scroll>
      <View style={{ gap: spacing.sm }}>
        <Text variant="title">Branches</Text>
        <Text variant="body" color="textMuted">
          {organization?.org_type === 'hospital'
            ? 'Add every location patients can visit. The first one is your primary address.'
            : 'Most practices only need one location, but you can add more here.'}
        </Text>
      </View>

      {error ? <Banner tone="danger" title="Something went wrong" message={error} /> : null}

      <View style={styles.section}>
        {branches.map((branch) => (
          <Card key={branch.id}>
            <View style={styles.branchRow}>
              <Ionicons name="location-outline" size={20} color={colors.primary} />
              <View style={styles.branchBody}>
                <Text variant="bodyStrong">
                  {branch.name}
                  {branch.is_primary ? ' · primary' : ''}
                </Text>
                <Text variant="caption" color="textMuted">
                  {branch.address ?? 'No address set'}
                </Text>
              </View>
              {branch.is_primary ? null : (
                <Pressable
                  onPress={() => void handleDelete(branch.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${branch.name}`}
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
          <Text variant="heading">Add a branch</Text>
          <TextField
            label="Branch name"
            required
            value={name}
            onChangeText={setName}
            placeholder="Andheri West"
          />
          <AddressMapPicker
            label="Branch location"
            coords={coords}
            onChangeCoords={setCoords}
            address={address}
            onChangeAddress={setAddress}
            height={200}
          />
          <Button
            label="Add branch"
            variant="secondary"
            size="md"
            icon="add"
            disabled={name.trim().length < 2 || address.trim().length < 5 || !coords}
            loading={saving}
            onPress={() => void handleAdd()}
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  branchRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  branchBody: { flex: 1, gap: 2 },
});
