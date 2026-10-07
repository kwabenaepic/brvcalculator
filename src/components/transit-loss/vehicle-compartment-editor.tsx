import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { LabeledTextInput } from '@/components/labeled-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parsePastedPoints, type CompartmentPointForm } from '@/hooks/use-vehicle-admin-form';

export type VehicleCompartmentEditorProps = {
  index: number;
  nominalCapacityLiters: string;
  onChangeNominalCapacityLiters: (text: string) => void;
  points: CompartmentPointForm[];
  onChangePoint: (pointIndex: number, patch: Partial<CompartmentPointForm>) => void;
  onAddPoint: () => void;
  onRemovePoint: (pointIndex: number) => void;
  onReplacePoints: (points: CompartmentPointForm[]) => void;
  onRemoveCompartment: () => void;
  removable: boolean;
  initiallyExpanded: boolean;
};

function summarize(nominalCapacityLiters: string, points: CompartmentPointForm[]): string {
  const nominal = Number(nominalCapacityLiters);
  const filledPoints = points.filter((point) => point.ullageCm.trim() || point.capacityLiters.trim()).length;
  const capacity = nominalCapacityLiters.trim() && !Number.isNaN(nominal) ? `${nominal.toLocaleString()} L` : 'No capacity';
  return `${capacity} · ${filledPoints} ${filledPoints === 1 ? 'point' : 'points'}`;
}

export function VehicleCompartmentEditor({
  index,
  nominalCapacityLiters,
  onChangeNominalCapacityLiters,
  points,
  onChangePoint,
  onAddPoint,
  onRemovePoint,
  onReplacePoints,
  onRemoveCompartment,
  removable,
  initiallyExpanded,
}: VehicleCompartmentEditorProps) {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const applyPaste = () => {
    const parsed = parsePastedPoints(pasteText);
    if (parsed.length === 0) {
      setPasteError('No points found — put one "ullage capacity" pair on each line.');
      return;
    }
    onReplacePoints(parsed);
    setPasteText('');
    setPasteError(null);
    setIsPasting(false);
  };

  const togglePaste = () => {
    setPasteError(null);
    setIsPasting((current) => !current);
  };

  // A compartment can hold dozens of hand-entered points, so removal takes a
  // second tap rather than happening on the first.
  const onPressRemove = () => {
    if (isConfirmingRemove) {
      onRemoveCompartment();
    } else {
      setIsConfirmingRemove(true);
    }
  };

  const cellStyle = [styles.cell, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.inputBorder }];

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => setIsExpanded((current) => !current)}
          hitSlop={Spacing.one}
          style={styles.headerToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}>
          <ThemedText type="smallBold" numberOfLines={1}>{`${isExpanded ? '▾' : '▸'}  Compartment ${index + 1}`}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {summarize(nominalCapacityLiters, points)}
          </ThemedText>
        </Pressable>
        {removable ? (
          <View style={styles.removeActions}>
            {isConfirmingRemove ? (
              <Pressable onPress={() => setIsConfirmingRemove(false)} hitSlop={Spacing.one}>
                <ThemedText type="small" themeColor="textSecondary">
                  Cancel
                </ThemedText>
              </Pressable>
            ) : null}
            <Pressable onPress={onPressRemove} hitSlop={Spacing.one}>
              <ThemedText type={isConfirmingRemove ? 'smallBold' : 'small'} themeColor="negative">
                {isConfirmingRemove ? 'Confirm' : 'Remove'}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </View>

      {isExpanded ? (
        <>
          <View style={styles.nominalRow}>
            <LabeledTextInput
              label="Nominal Capacity"
              value={nominalCapacityLiters}
              onChangeText={onChangeNominalCapacityLiters}
              keyboardType="decimal-pad"
              placeholder="e.g. 9000"
              unit="L"
              compact
            />
          </View>

          <View style={styles.table}>
            <View style={styles.tableRow}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.indexCell}>
                #
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.headerCell}>
                Ullage (cm)
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.headerCell}>
                Capacity (L)
              </ThemedText>
              <View style={styles.removeCell} />
            </View>
            {points.map((point, pointIndex) => (
              <View key={pointIndex} style={styles.tableRow}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.indexCell}>
                  {pointIndex + 1}
                </ThemedText>
                <TextInput
                  style={cellStyle}
                  value={point.ullageCm}
                  onChangeText={(text) => onChangePoint(pointIndex, { ullageCm: text })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  accessibilityLabel={`Compartment ${index + 1} point ${pointIndex + 1} ullage in centimetres`}
                />
                <TextInput
                  style={cellStyle}
                  value={point.capacityLiters}
                  onChangeText={(text) => onChangePoint(pointIndex, { capacityLiters: text })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  accessibilityLabel={`Compartment ${index + 1} point ${pointIndex + 1} capacity in litres`}
                />
                <View style={styles.removeCell}>
                  {points.length > 1 ? (
                    <Pressable
                      onPress={() => onRemovePoint(pointIndex)}
                      hitSlop={Spacing.two}
                      accessibilityLabel={`Remove point ${pointIndex + 1}`}>
                      <ThemedText type="small" themeColor="negative">
                        ✕
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.pointActions}>
            <Pressable onPress={onAddPoint} hitSlop={Spacing.one}>
              <ThemedText type="smallBold" themeColor="accent">
                + Add point
              </ThemedText>
            </Pressable>
            <Pressable onPress={togglePaste} hitSlop={Spacing.one}>
              <ThemedText type="smallBold" themeColor="accent">
                {isPasting ? 'Cancel paste' : 'Paste points'}
              </ThemedText>
            </Pressable>
          </View>

          {isPasting ? (
            <View style={styles.paste}>
              <LabeledTextInput
                label="Paste two columns — ullage (cm) and capacity (L), one point per line"
                value={pasteText}
                onChangeText={setPasteText}
                placeholder={'24.4  9050\n25.7  9000\n27.1  8950'}
                autoCapitalize="none"
                multiline
              />
              {pasteError ? (
                <ThemedText type="small" themeColor="negative">
                  {pasteError}
                </ThemedText>
              ) : null}
              <Pressable
                onPress={applyPaste}
                style={({ pressed }) => [
                  styles.pasteButton,
                  { backgroundColor: theme.accent },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.pasteButtonText}>
                  Replace points with pasted list
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headerToggle: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  removeActions: {
    flexShrink: 0,
    flexDirection: 'row',
    gap: Spacing.three,
  },
  nominalRow: {
    flexDirection: 'row',
    maxWidth: 260,
  },
  table: {
    gap: Spacing.one,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  indexCell: {
    width: 24,
    textAlign: 'right',
  },
  headerCell: {
    flex: 1,
  },
  cell: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    fontSize: 16,
  },
  removeCell: {
    width: 20,
    alignItems: 'center',
  },
  pointActions: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  paste: {
    gap: Spacing.two,
  },
  pasteButton: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pasteButtonText: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.6,
  },
});
