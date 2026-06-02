import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Faz upload de uma imagem de perfil e retorna a URL pública.
 * Caminho: users/{uid}/profile.jpg
 */
export async function uploadProfilePhoto(uid: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storageRef = ref(storage, `users/${uid}/profile.jpg`);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/**
 * Comprime + faz upload de foto de evento.
 * Reduz pra 1200px largura máx e qualidade 0.75 (economiza storage e banda).
 * Retorna URL pública do Firebase Storage.
 */
export async function uploadEventPhoto(
  eventId: string,
  localUri: string
): Promise<string> {
  // Comprime antes de upload (import lazy para não quebrar se nativo indisponível)
  let uriToUpload = localUri;
  try {
    const ImageManipulator = require('expo-image-manipulator');
    const compressed = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 1200 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
    );
    uriToUpload = compressed.uri;
  } catch {
    // Nativo indisponível — usa a imagem original sem compressão
    if (__DEV__) console.warn('[storageService] expo-image-manipulator indisponível, usando imagem original');
  }

  const response = await fetch(uriToUpload);
  const blob = await response.blob();
  const storageRef = ref(storage, `events/${eventId}/photo.jpg`);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}
