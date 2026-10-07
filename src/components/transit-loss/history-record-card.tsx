import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SummaryRow } from '@/components/transit-loss/summary-row';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TransitLossRecord } from '@/utils/history';

export type HistoryRecordCardProps = {
  record: TransitLossRecord;
  /** Shown under the date, e.g. for a record still waiting to upload. */
  note?: { text: string; tone: 'warning' | 'negative' };
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString();
}

export function HistoryRecordCard({ record, note }: HistoryRecordCardProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Pressable onPress={() => setExpanded((current) => !current)} style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="smallBold">{record.regNumber}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDateTime(record.createdAt)}
          </ThemedText>
          {note ? (
            <ThemedText type="small" themeColor={note.tone}>
              {note.text}
            </ThemedText>
          ) : null}
        </View>
        <ThemedText
          type="smallBold"
          style={record.lossAt15 !== null && record.lossAt15 < 0 ? { color: theme.negative } : undefined}>
          {record.lossAt15 === null ? '—' : `${record.lossAt15} L`}
        </ThemedText>
      </Pressable>

      {expanded ? (
        <View style={styles.detail}>
          <SummaryRow label="Cert No" value={record.certNo} />
          <SummaryRow label="Bulk No" value={record.bulkNo} />
          <SummaryRow label="Total Loaded" value={record.totalLoaded} unit="L" />
          <SummaryRow label="Total Received" value={record.totalReceived} unit="L" />
          <SummaryRow label="Observed Difference" value={record.observedDiff} unit="L" colorBySign />
          <SummaryRow label="Loaded Volume @15°C" value={record.loadedVolumeAt15} unit="L" />
          <SummaryRow label="Received Volume @15°C" value={record.receivedVolumeAt15} unit="L" />
          <SummaryRow label="Loss @15°C" value={record.lossAt15} unit="L" emphasize />
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerText: {
    // Take the remaining width so a long note wraps instead of overflowing.
    flex: 1,
    gap: Spacing.half,
  },
  detail: {
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
});
