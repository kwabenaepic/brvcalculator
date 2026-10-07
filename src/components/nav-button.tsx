import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type NavButtonProps = {
  label: string;
  /** Navigates like a link (real `<a href>` on web, so middle-click/new-tab work). */
  href?: Href;
  onPress?: () => void;
  /** 'muted' for low-emphasis actions such as Sign Out. */
  tone?: 'default' | 'muted';
  accessibilityLabel?: string;
};

/**
 * Outlined header button used for top-level navigation. Hover/press state is
 * tracked in React state and the style is passed as one flattened object:
 * `<Link asChild>` hands its child's style straight to the DOM on web, which
 * drops `style={({ pressed }) => …}` callbacks (leaving these looking like
 * bare text) and throws on style arrays.
 */
export function NavButton({ label, href, onPress, tone = 'default', accessibilityLabel }: NavButtonProps) {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const isActive = isHovered || isPressed;
  const textColor: ThemeColor = isActive ? 'accent' : tone === 'muted' ? 'textSecondary' : 'text';

  const button = (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      accessibilityRole={href ? 'link' : 'button'}
      accessibilityLabel={accessibilityLabel}
      style={StyleSheet.flatten([
        styles.button,
        {
          backgroundColor: isPressed ? theme.accentBackground : theme.surface,
          borderColor: isActive ? theme.accent : theme.inputBorder,
        },
      ])}>
      <ThemedText type="smallBold" themeColor={textColor}>
        {label}
      </ThemedText>
    </Pressable>
  );

  return href ? (
    <Link href={href} asChild>
      {button}
    </Link>
  ) : (
    button
  );
}

const styles = StyleSheet.create({
  button: {
    // Hug the label rather than stretching across a column layout.
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three - Spacing.one,
    paddingVertical: Spacing.one,
  },
});
