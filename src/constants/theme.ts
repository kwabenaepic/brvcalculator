/**
 * The app's color palette. The app is light-only by design: it stays light
 * even when the device is in dark mode (see also `userInterfaceStyle` in
 * app.json and `color-scheme` in global.css).
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  text: '#000000',
  /** Page background behind cards. */
  background: '#F2F4F7',
  contentBackground: '#F2F4F7',
  /** Cards, inputs, list rows — anything that sits on the page. */
  surface: '#FFFFFF',
  backgroundElement: '#FFFFFF',
  backgroundSelected: '#ECEEF1',
  /** Card outlines and dividers. */
  border: '#E4E7EC',
  /** Text-input outlines — stronger than card borders so fields stand out. */
  inputBorder: '#D0D5DD',
  textSecondary: '#6B6F76',
  accent: '#3c87f7',
  accentBackground: '#EAF2FE',
  loadedAccent: '#3c87f7',
  receivedAccent: '#e8871e',
  negative: '#D14343',
  positive: '#1E8E3E',
  warning: '#8A5A00',
  warningBackground: '#FDF0D5',
} as const;

export type ThemeColor = keyof typeof Colors;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
