import { useColorScheme } from 'react-native';

export const lightColors = {
  background: '#F7F3EB',
  surface: '#FFFCF6',
  surfaceMuted: '#EFE9DE',
  text: '#292724',
  textMuted: '#716B62',
  border: '#DED5C8',
  accent: '#C85F3D',
  accentSoft: '#F2DED3',
  sage: '#7E9270',
  sageSoft: '#E4EBDD',
  blue: '#6D8292',
  blueSoft: '#E1E8ED',
  success: '#607B55',
  destructive: '#A94838',
  tabBar: '#FCF8F1',
} as const;

export const darkColors = {
  background: '#191816',
  surface: '#23211E',
  surfaceMuted: '#302D29',
  text: '#F5EFE5',
  textMuted: '#B8AFA3',
  border: '#403C36',
  accent: '#E27B56',
  accentSoft: '#4A2D24',
  sage: '#9CB08E',
  sageSoft: '#2C392A',
  blue: '#9AAEBC',
  blueSoft: '#29363F',
  success: '#94B187',
  destructive: '#E38A77',
  tabBar: '#211F1C',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
} as const;

export function useAppTheme() {
  const scheme = useColorScheme();
  return {
    colors: scheme === 'dark' ? darkColors : lightColors,
    isDark: scheme === 'dark',
    spacing,
    radius,
  };
}

export type AppTheme = ReturnType<typeof useAppTheme>;

