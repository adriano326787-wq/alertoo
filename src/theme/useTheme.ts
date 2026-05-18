/**
 * Hook que devolve o tema ativo (light/dark) baseado no sistema.
 * Re-renderiza automaticamente ao mudar o sistema.
 */

import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, Theme } from './tokens';

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}
