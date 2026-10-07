import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavButton } from '@/components/nav-button';
import { CompartmentsSection } from '@/components/transit-loss/compartments-section';
import { SaveRecordButton } from '@/components/transit-loss/save-record-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TotalsSection } from '@/components/transit-loss/totals-section';
import { VcfSection } from '@/components/transit-loss/vcf-section';
import { VehicleInfoSection } from '@/components/transit-loss/vehicle-info-section';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { useTransitLossCalculator } from '@/hooks/use-transit-loss-calculator';

export default function TransitLossCalculatorScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { session, isAdmin, signOut } = useSession();
  const {
    regNumberInput,
    setRegNumberInput,
    vehicleDetails,
    vehicleLookupStatus,
    vehicleDataSource,
    vehicleSavedAt,
    showOfflineExpiredWarning,
    lookupVehicle,
    loadedUllageInputs,
    setLoadedUllage,
    receivedUllageInputs,
    setReceivedUllage,
    loadedTemperatureInput,
    setLoadedTemperatureInput,
    loadedDensityInput,
    setLoadedDensityInput,
    receivedTemperatureInput,
    setReceivedTemperatureInput,
    receivedDensityInput,
    setReceivedDensityInput,
    summary,
    saveRecord,
    saveStatus,
  } = useTransitLossCalculator();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView
        style={[
          styles.headerWrapper,
          { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: insets.top },
        ]}>
        <ThemedView type="surface" style={styles.headerInner}>
          <ThemedView type="surface" style={styles.headerRow}>
            <ThemedText type="title" style={styles.title}>
              Transit Loss Calculator
            </ThemedText>
            <ThemedView type="surface" style={styles.headerActions}>
              {isAdmin ? <NavButton label="Vehicles" href="/admin-vehicles" /> : null}
              <NavButton label="History" href="/history" />
              {session ? (
                <NavButton label="Sign Out" onPress={signOut} tone="muted" />
              ) : (
                <NavButton label="Admin Sign In" href="/sign-in" tone="muted" />
              )}
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      <ScrollView
        style={[styles.flex, { backgroundColor: theme.contentBackground }]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <ThemedView type="contentBackground" style={styles.container}>
          <VehicleInfoSection
            regNumber={regNumberInput}
            onChangeRegNumber={setRegNumberInput}
            onLookup={lookupVehicle}
            vehicleDetails={vehicleDetails}
            lookupStatus={vehicleLookupStatus}
            dataSource={vehicleDataSource}
            savedAt={vehicleSavedAt}
            showOfflineExpiredWarning={showOfflineExpiredWarning}
          />

          <CompartmentsSection
            compartments={vehicleDetails?.compartments ?? []}
            loadedUllageValues={loadedUllageInputs}
            onChangeLoadedUllage={setLoadedUllage}
            loadedVolumes={summary.loadedCompartmentVolumes}
            receivedUllageValues={receivedUllageInputs}
            onChangeReceivedUllage={setReceivedUllage}
            receivedVolumes={summary.receivedCompartmentVolumes}
          />

          <TotalsSection summary={summary} />

          <VcfSection
            loadedTemperatureInput={loadedTemperatureInput}
            onChangeLoadedTemperature={setLoadedTemperatureInput}
            loadedDensityInput={loadedDensityInput}
            onChangeLoadedDensity={setLoadedDensityInput}
            receivedTemperatureInput={receivedTemperatureInput}
            onChangeReceivedTemperature={setReceivedTemperatureInput}
            receivedDensityInput={receivedDensityInput}
            onChangeReceivedDensity={setReceivedDensityInput}
            summary={summary}
          />

          <SaveRecordButton disabled={!vehicleDetails} status={saveStatus} onPress={saveRecord} />
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    width: '100%',
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  headerWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  headerInner: {
    maxWidth: MaxContentWidth,
    width: '100%',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    rowGap: Spacing.two,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
});
