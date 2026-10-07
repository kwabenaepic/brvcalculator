import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SummaryRowProps = {
  label: string;
  value: number | string | null;
  unit?: string;
  emphasize?: boolean;
  colorBySign?: boolean;
};

export function SummaryRow({
  label,
  value,
  unit,
  emphasize = false,
  colorBySign = false,
}: SummaryRowProps) {
  const theme = useTheme();

  const isNegative = colorBySign && typeof value === 'number' && value < 0;
  const isPositive = colorBySign && typeof value === 'number' && value > 0;

  const displayValue =
    value === null
      ? '—'
      : isNegative
        ? `(${Math.abs(value as number)}${unit ? ` ${unit}` : ''})`
        : `${value}${unit ? ` ${unit}` : ''}`;

  const valueColor = isNegative ? theme.negative : isPositive ? theme.positive : undefined;

  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText
        type={emphasize ? 'smallBold' : 'small'}
        style={valueColor ? { color: valueColor } : undefined}>
        {displayValue}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
