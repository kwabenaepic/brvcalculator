import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HistorySaveStatus } from '@/hooks/use-transit-loss-history';

export type SaveRecordButtonProps = {
  disabled: boolean;
  status: HistorySaveStatus;
  onPress: () => void;
};

function statusMessage(status: HistorySaveStatus): string | null {
  switch (status) {
    case 'saved':
      return 'Saved to history';
    case 'queued':
      return 'No connection — saved on this device. It will upload to history automatically when you’re back online.';
    case 'error':
      return "Couldn't save — check your connection";
    case 'not-configured':
      return 'History isn’t set up for this app yet';
    default:
      return null;
  }
}

export function SaveRecordButton({ disabled, status, onPress }: SaveRecordButtonProps) {
  const theme = useTheme();
  const isSaving = status === 'saving';
  const message = statusMessage(status);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        disabled={disabled || isSaving}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.accent },
          (pressed || isSaving || disabled) && styles.buttonPressed,
        ]}>
        <ThemedText type="smallBold" style={styles.buttonText}>
          {isSaving ? 'Saving…' : 'Save Record'}
        </ThemedText>
      </Pressable>
      {message ? (
        <ThemedText
          type="small"
          themeColor={status === 'error' || status === 'not-configured' || status === 'queued' ? 'warning' : 'textSecondary'}>
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
    alignItems: 'flex-start',
  },
  button: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  buttonPressed: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
  },
});
