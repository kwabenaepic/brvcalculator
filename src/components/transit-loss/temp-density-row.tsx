import { StyleSheet, View } from 'react-native';

import { LabeledTextInput } from '@/components/labeled-text-input';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type TempDensityRowProps = {
  label: string;
  temperatureValue: string;
  onChangeTemperature: (text: string) => void;
  densityValue: string;
  onChangeDensity: (text: string) => void;
};

export function TempDensityRow({
  label,
  temperatureValue,
  onChangeTemperature,
  densityValue,
  onChangeDensity,
}: TempDensityRowProps) {
  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.row}>
        <LabeledTextInput
          label="Temperature"
          value={temperatureValue}
          onChangeText={onChangeTemperature}
          keyboardType="decimal-pad"
          placeholder="30"
          unit="°C"
          compact
        />
        <LabeledTextInput
          label="Density"
          value={densityValue}
          onChangeText={onChangeDensity}
          keyboardType="decimal-pad"
          placeholder="820"
          unit="kg/m³"
          compact
        />
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
});
