import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
}

/** Square image from the photo library — used for avatars and org logos. */
export async function pickImage(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  return {
    uri: asset.uri,
    name: asset.fileName ?? 'image.jpg',
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}

/** PDF or image — used for licences, registrations and patient-uploaded reports. */
export async function pickDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? 'application/octet-stream',
  };
}
