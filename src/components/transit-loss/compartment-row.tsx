import { StyleSheet, View } from 'react-native';

import { LabeledTextInput } from '@/components/labeled-text-input';
import { ThemedText } from '@/components/themed-text';
import { SummaryRow } from '@/components/transit-loss/summary-row';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CompartmentRowProps = {
  index: number;
  nominalCapacityLiters: number;
  loadedUllage: string;
  onChangeLoadedUllage: (text: string) => void;
  loadedVolume: number | null;
  receivedUllage: string;
  onChangeReceivedUllage: (text: string) => void;
  receivedVolume: number | null;
};

export function CompartmentRow({
  index,
  nominalCapacityLiters,
  loadedUllage,
  onChangeLoadedUllage,
  loadedVolume,
  receivedUllage,
  onChangeReceivedUllage,
  receivedVolume,
}: CompartmentRowProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">
        {`Compartment ${index}`}{' '}
        <ThemedText type="small" themeColor="textSecondary">
          {`(nominal ${nominalCapacityLiters} L)`}
        </ThemedText>
      </ThemedText>
      <View style={styles.row}>
        <View style={[styles.column, { borderLeftColor: theme.loadedAccent }]}>
          <LabeledTextInput
            label="Loaded Ullage"
            value={loadedUllage}
            onChangeText={onChangeLoadedUllage}
            keyboardType="decimal-pad"
            placeholder="0"
            unit="cm"
          />
          <SummaryRow label="Loaded Volume" value={loadedVolume} unit="L" />
        </View>
        <View style={[styles.column, { borderLeftColor: theme.receivedAccent }]}>
          <LabeledTextInput
            label="Received Ullage"
            value={receivedUllage}
            onChangeText={onChangeReceivedUllage}
            keyboardType="decimal-pad"
            placeholder="0"
            unit="cm"
          />
          <SummaryRow label="Received Volume" value={receivedVolume} unit="L" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  column: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 100,
    gap: Spacing.one,
    borderLeftWidth: 3,
    paddingLeft: Spacing.two,
  },
});
