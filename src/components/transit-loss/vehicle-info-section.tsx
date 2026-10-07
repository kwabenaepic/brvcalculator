import { Pressable, StyleSheet, View } from 'react-native';

import { LabeledTextInput } from '@/components/labeled-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SectionCard } from '@/components/transit-loss/section-card';
import { SummaryRow } from '@/components/transit-loss/summary-row';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { VehicleDataSource, VehicleLookupStatus } from '@/hooks/use-transit-loss-calculator';
import type { VehicleDetails } from '@/utils/vehicle-lookup';

export type VehicleInfoSectionProps = {
  regNumber: string;
  onChangeRegNumber: (text: string) => void;
  onLookup: () => void;
  vehicleDetails: VehicleDetails | null;
  lookupStatus: VehicleLookupStatus;
  dataSource: VehicleDataSource;
  /** When the device copy in use was fetched, if known. */
  savedAt: string | null;
  showOfflineExpiredWarning: boolean;
};

function savedCopyMessage(savedAt: string | null): string {
  return savedAt
    ? `No connection — using the copy saved on this device ${new Date(savedAt).toLocaleString()}.`
    : 'No connection — using the copy saved on this device.';
}

export function VehicleInfoSection({
  regNumber,
  onChangeRegNumber,
  onLookup,
  vehicleDetails,
  lookupStatus,
  dataSource,
  savedAt,
  showOfflineExpiredWarning,
}: VehicleInfoSectionProps) {
  const theme = useTheme();
  const isLoading = lookupStatus === 'loading';
  const notFound = lookupStatus === 'not-found';
  const offlineUnavailable = lookupStatus === 'offline-unavailable';

  const fallbackText = offlineUnavailable
    ? "Can't verify — offline, and this vehicle isn't saved on this device"
    : notFound
      ? 'Not found'
      : null;

  return (
    <SectionCard title="Vehicle Info">
      <View style={styles.regRow}>
        <LabeledTextInput
          label="Reg. Number"
          value={regNumber}
          onChangeText={onChangeRegNumber}
          placeholder="Reg. Number"
          autoCapitalize="characters"
          compact
        />
        <Pressable
          onPress={onLookup}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.lookupButton,
            { backgroundColor: theme.accent },
            (pressed || isLoading) && styles.lookupButtonPressed,
          ]}>
          <ThemedText type="smallBold" style={styles.lookupButtonText}>
            {isLoading ? 'Looking up…' : 'Look Up'}
          </ThemedText>
        </Pressable>
      </View>

      <SummaryRow label="Cert No" value={fallbackText ?? (vehicleDetails?.certNo ?? null)} />
      <SummaryRow label="Bulk No" value={fallbackText ?? (vehicleDetails?.bulkNo ?? null)} />
      <SummaryRow label="Expiry Date" value={fallbackText ?? (vehicleDetails?.expiryDate ?? null)} />

      {lookupStatus === 'found' && dataSource === 'cache' ? (
        <ThemedText type="small" themeColor="textSecondary">
          {savedCopyMessage(savedAt)}
        </ThemedText>
      ) : null}

      {showOfflineExpiredWarning ? (
        <ThemedView
          style={[styles.warningBanner, { backgroundColor: theme.warningBackground }]}>
          <ThemedText type="smallBold" style={{ color: theme.warning }}>
            Certificate expired — showing last-known offline data. Verify before proceeding.
          </ThemedText>
        </ThemedView>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  regRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  lookupButton: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  lookupButtonPressed: {
    opacity: 0.6,
  },
  lookupButtonText: {
    color: '#FFFFFF',
  },
  warningBanner: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
});
