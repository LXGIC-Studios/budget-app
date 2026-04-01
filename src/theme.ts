import { Platform } from "react-native";

export const colors = {
  bg: '#000000',
  card: '#080808',
  cardBorder: '#1c1c1c',
  surface: '#0e0e0e',
  primary: '#00ffcc',
  primaryDark: '#00cca3',
  primaryLight: 'rgba(0, 255, 204, 0.08)',
  primaryBorder: 'rgba(0, 255, 204, 0.2)',
  primarySolid: '#00ffcc',
  primaryText: '#000000',
  accent: '#ff003c',
  pink: '#FF00AA',
  purple: '#8b00ff',
  yellow: '#BFFF00',
  cyan: '#00F0FF',
  white: '#ffffff',
  textSecondary: '#555555',
  dimmed: '#222222',
  red: '#ff003c',
  redBg: 'rgba(255, 0, 60, 0.10)',
  redBorder: 'rgba(255, 0, 60, 0.2)',
  greenBg: 'rgba(0, 255, 204, 0.06)',
  greenBorder: 'rgba(0, 255, 204, 0.2)',
  yellowBg: 'rgba(191, 255, 0, 0.08)',
  yellowBorder: 'rgba(191, 255, 0, 0.2)',
  inputBg: '#080808',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  full: 0,
} as const;

// Font families - web gets real fonts, native gets system
export const fonts = {
  heading: Platform.select({
    web: "'Orbitron', sans-serif",
    default: undefined,
  }),
  mono: Platform.select({
    web: "'JetBrains Mono', monospace",
    default: undefined,
  }),
  body: Platform.select({
    web: "'Space Grotesk', sans-serif",
    default: undefined,
  }),
};
