import { useCallback, useState } from 'react';
import * as Location from 'expo-location';

import type { LatLng } from '@/types';

export interface LocationState {
  coords: LatLng | null;
  address: string | null;
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'error';
  error: string | null;
}

/** Turn an expo-location reverse-geocode result into a single-line address. */
export function formatGeocodedAddress(place: Location.LocationGeocodedAddress): string {
  return [place.name, place.street, place.district, place.city, place.region, place.postalCode]
    .filter((part, index, all) => Boolean(part) && all.indexOf(part) === index)
    .join(', ');
}

export async function reverseGeocode(coords: LatLng): Promise<string | null> {
  try {
    const [place] = await Location.reverseGeocodeAsync({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    return place ? formatGeocodedAddress(place) : null;
  } catch {
    return null;
  }
}

/**
 * Foreground location with reverse geocoding. Permission is requested on demand
 * (when the user taps "Use my current location"), never at module load.
 */
export function useLocation() {
  const [state, setState] = useState<LocationState>({
    coords: null,
    address: null,
    status: 'idle',
    error: null,
  });

  const request = useCallback(async (): Promise<LatLng | null> => {
    setState((s) => ({ ...s, status: 'requesting', error: null }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setState((s) => ({
          ...s,
          status: 'denied',
          error: 'Location permission was not granted.',
        }));
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords: LatLng = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      const address = await reverseGeocode(coords);
      setState({ coords, address, status: 'granted', error: null });
      return coords;
    } catch (error) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: error instanceof Error ? error.message : 'Could not get your location.',
      }));
      return null;
    }
  }, []);

  return { ...state, request };
}
