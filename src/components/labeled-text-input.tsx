import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type LabeledTextInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: TextInputProps['keyboardType'];
  placeholder?: string;
  editable?: boolean;
  unit?: string;
  compact?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  secureTextEntry?: boolean;
  multiline?: boolean;
};

export function LabeledTextInput({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  placeholder,
  editable = true,
  unit,
  compact = false,
  autoCapitalize,
  secureTextEntry,
  multiline,
}: LabeledTextInputProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <ThemedText type="small" themeColor={editable ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            {
              color: editable ? theme.text : theme.textSecondary,
              backgroundColor: theme.surface,
              borderColor: theme.inputBorder,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          editable={editable}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : undefined}
        />
        {unit ? (
          <ThemedText type="small" themeColor="textSecondary">
            {unit}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.half,
    flexGrow: 1,
  },
  containerCompact: {
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 100,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minWidth: 0,
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 120,
  },
});
