import { Platform } from 'react-native';

const palette = {
  teal900: '#053B3B',
  teal700: '#0B6E6E',
  teal600: '#3FBFBF',
  teal100: '#DCF2F1',
  teal50: '#F1FAFA',
  coral600: '#B3261E',
  coral100: '#FBE6E3',
  amber600: '#8A5A00',
  amber100: '#FDF0D5',
  green600: '#256B49',
  green100: '#DEF4E7',
  slate900: '#0F1724',
  slate700: '#334155',
  slate500: '#64748B',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  white: '#FFFFFF',
  black: '#000000',
  ink900: '#E6EDF3',
  ink700: '#B7C4D0',
  ink500: '#8496A6',
  ink300: '#3A4654',
  ink200: '#28323D',
  ink100: '#1B232C',
  ink50: '#141A21',
};

export const lightColors = {
  background: palette.slate50,
  surface: palette.white,
  surfaceMuted: palette.slate100,
  border: palette.slate200,
  borderStrong: palette.slate300,
  text: palette.slate900,
  textMuted: palette.slate500,
  textSubtle: palette.slate700,
  primary: palette.teal700,
  primaryStrong: palette.teal900,
  primarySoft: palette.teal100,
  primarySofter: palette.teal50,
  onPrimary: palette.white,
  onDanger: palette.white,
  danger: palette.coral600,
  dangerSoft: palette.coral100,
  warning: palette.amber600,
  warningSoft: palette.amber100,
  success: palette.green600,
  successSoft: palette.green100,
  overlay: 'rgba(15, 23, 36, 0.45)',
};

export const darkColors: typeof lightColors = {
  background: palette.ink50,
  surface: palette.ink100,
  surfaceMuted: palette.ink200,
  border: palette.ink200,
  borderStrong: palette.ink300,
  text: palette.ink900,
  textMuted: palette.ink500,
  textSubtle: palette.ink700,
  primary: palette.teal600,
  primaryStrong: palette.teal100,
  primarySoft: '#0C3B3B',
  primarySofter: '#0A2C2C',
  onPrimary: palette.ink50,
  onDanger: palette.ink50,
  danger: '#F08A7E',
  dangerSoft: '#3D211E',
  warning: '#E0A94A',
  warningSoft: '#3A2E15',
  success: '#5CC08C',
  successSoft: '#173628',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export type AppColors = typeof lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
} as const;

export type TypographyVariant = keyof typeof typography;

export const shadow = Platform.select({
  ios: {
    shadowColor: '#0F1724',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 2 },
  default: {},
});
