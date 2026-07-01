import { RefObject } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Captura o EventStoryCard renderizado off-screen e gera um PNG 1080x1920
 * (upscale a partir do tamanho de renderização 270x480 — ver EventStoryCard).
 *
 * Retorna o caminho local do arquivo (file://...) ou null se a captura falhar
 * (ex: ref ainda não montado, imagem remota não carregou a tempo).
 */
export async function captureEventStoryImage(ref: RefObject<View | null>): Promise<string | null> {
  if (!ref.current) return null;
  try {
    return await captureRef(ref, {
      format: 'png',
      quality: 0.92,
      width: 1080,
      height: 1920,
    });
  } catch {
    return null;
  }
}
