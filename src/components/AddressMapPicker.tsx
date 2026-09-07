import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MapView, { Circle, Marker, PROVIDER_DEFAULT, type Region } from 'react-native-maps';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { reverseGeocode, useLocation } from '@/hooks/useLocation';
import type { LatLng } from '@/types';

import { Text } from './Text';
import { TextField } from './TextField';

/** Falls back to a wide view of India until the user picks a point. */
const FALLBACK_REGION: Region = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 12,
  longitudeDelta: 12,
};

export interface AddressMapPickerProps {
  coords: LatLng | null;
  onChangeCoords: (coords: LatLng) => void;
  address: string;
  onChangeAddress: (address: string) => void;
  label?: string;
  addressLabel?: string;
  /** When set, draws the home-visit service area around the pin. */
  radiusKm?: number;
  height?: number;
  error?: string;
}

/**
 * Address text plus a draggable map pin. Dragging the pin reverse-geocodes into the
 * address field, but the field stays editable — geocoders are wrong often enough that
 * the provider must be able to correct the text without moving the coordinates.
 */
export function AddressMapPicker({
  coords,
  onChangeCoords,
  address,
  onChangeAddress,
  label = 'Location',
  addressLabel = 'Address',
  radiusKm,
  height = 220,
  error,
}: AddressMapPickerProps) {
  const { colors } = useTheme();
  const mapRef = useRef<MapView>(null);
  const { request, status } = useLocation();
  const [locating, setLocating] = useState(false);

  const region: Region = coords
    ? { ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : FALLBACK_REGION;

  useEffect(() => {
    if (coords) {
      mapRef.current?.animateToRegion(
        { ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        400,
      );
    }
  }, [coords]);

  const applyCoords = async (next: LatLng) => {
    onChangeCoords(next);
    const resolved = await reverseGeocode(next);
    if (resolved && !address.trim()) onChangeAddress(resolved);
  };

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    const next = await request();
    if (next) {
      onChangeCoords(next);
      const resolved = await reverseGeocode(next);
      if (resolved) onChangeAddress(resolved);
    }
    setLocating(false);
  };

  return (
    <View style={styles.container}>
      <Text variant="label" color="textMuted">
        {label.toUpperCase()}
      </Text>

      <View style={[styles.mapWrap, { height, borderColor: colors.border }]}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onPress={(e) => void applyCoords(e.nativeEvent.coordinate)}
        >
          {coords ? (
            <Marker
              coordinate={coords}
              draggable
              onDragEnd={(e) => void applyCoords(e.nativeEvent.coordinate)}
            />
          ) : null}
          {coords && radiusKm ? (
            <Circle
              center={coords}
              radius={radiusKm * 1000}
              strokeColor={colors.primary}
              fillColor="rgba(14, 138, 138, 0.15)"
            />
          ) : null}
        </MapView>

        <Pressable
          accessibilityRole="button"
          onPress={() => void handleUseCurrentLocation()}
          style={[styles.gpsButton, { backgroundColor: colors.surface }]}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="locate" size={18} color={colors.primary} />
          )}
        </Pressable>
      </View>

      <Text variant="caption" color="textMuted">
        {coords
          ? `Pin: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} — tap or drag to adjust.`
          : 'Tap the map or use the locate button to drop a pin.'}
      </Text>
      {status === 'denied' ? (
        <Text variant="caption" color="warning">
          Location permission is off. You can still drop the pin manually.
        </Text>
      ) : null}

      <TextField
        label={addressLabel}
        value={address}
        onChangeText={onChangeAddress}
        placeholder="Building, street, area, city"
        multiline
        error={error}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  mapWrap: { borderRadius: radius.md, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  gpsButton: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
