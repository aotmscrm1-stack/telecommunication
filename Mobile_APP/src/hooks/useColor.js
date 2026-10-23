// src/hooks/useColor.js
import { useColorScheme } from 'react-native';
import { darkColors, lightColors } from '../theme/colors';

export function useColor(key = 'primary') {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? darkColors : lightColors;
  return palette[key] ?? palette.primary;
}

export function usePalette() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}
