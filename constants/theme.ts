/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#E4572E';
const tintColorDark = '#fff';

export const Design = {
  colors: {
    primary: '#E4572E',
    secondary: '#0B7A75',
    accent: '#F0B429',
    background: '#F7F2EA',
    surface: '#FFFFFF',
    ink: '#1F2A2E',
    muted: '#6F6A64',
    border: '#E9E0D4',
    success: '#2A9D8F',
    danger: '#C44536',
    info: '#4C6FFF',
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
  typography: {
    title: {
      fontSize: 20,
      fontWeight: '700' as const,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 14,
    },
    caption: {
      fontSize: 12,
    },
  },
};

export const Colors = {
  light: {
    text: Design.colors.ink,
    background: Design.colors.background,
    tint: tintColorLight,
    icon: Design.colors.muted,
    tabIconDefault: Design.colors.muted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

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
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
