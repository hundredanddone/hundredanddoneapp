import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { AddressMapPicker, Banner, Button, Chip, Screen, Text, TextField } from '@/components';
import { spacing } from '@/constants/theme';
import { useCreatePatientAddress } from '@/features/booking';
import type { LatLng } from '@/types';

const LABEL_PRESETS = ['Home', 'Work', 'Parents', 'Other'];

/**
 * Add a home-visit address.
 *
 * Reached from the booking flow (when a home visit has nowhere to go) and from the
 * patient profile. Coordinates are required, not optional: the provider physically
 * travels here, and `discover_organizations` matches home visits against the service
 * area by distance, so an address without a pin is useless to both sides.
 */
export default function NewPatientAddressScreen() {
  const createAddress = useCreatePatientAddress();

  const [label, setLabel] = useState('Home');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSave = label.trim().length > 0 && address.trim().length >= 5 && coords !== null;

  const handleSave = async () => {
    if (!canSave) return;
    setError(null);
    try {
      await createAddress.mutateAsync({
        label: label.trim(),
        address: address.trim(),
        coords,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this address.');
    }
  };

  return (
    <Screen
      scroll
      footer={
        <Button
          label="Save address"
          onPress={() => void handleSave()}
          disabled={!canSave}
          loading={createAddress.isPending}
        />
      }
    >
      <View style={styles.header}>
        <Text variant="title">Add an address</Text>
        <Text variant="body" color="textMuted">
          Where should the doctor come? Drop the pin accurately — they navigate to it.
        </Text>
      </View>

      {error ? <Banner tone="danger" title="Could not save" message={error} /> : null}

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          LABEL
        </Text>
        <View style={styles.chips}>
          {LABEL_PRESETS.map((preset) => (
            <Chip
              key={preset}
              label={preset}
              selected={label === preset}
              onPress={() => setLabel(preset)}
            />
          ))}
        </View>
        <TextField
          value={label}
          onChangeText={setLabel}
          placeholder="Home"
          hint="Shown when you pick an address at booking time."
        />
      </View>

      <AddressMapPicker
        label="Your location"
        addressLabel="Full address"
        coords={coords}
        onChangeCoords={setCoords}
        address={address}
        onChangeAddress={setAddress}
        height={240}
      />

      {!coords ? (
        <Banner
          tone="info"
          title="Drop a pin to continue"
          message="Tap the map, or use the locate button, so the doctor knows exactly where to go."
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
