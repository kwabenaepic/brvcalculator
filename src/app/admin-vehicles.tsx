import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavButton } from '@/components/nav-button';
import { LabeledTextInput } from '@/components/labeled-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SectionCard } from '@/components/transit-loss/section-card';
import { VehicleCompartmentEditor } from '@/components/transit-loss/vehicle-compartment-editor';
import { VehicleList } from '@/components/transit-loss/vehicle-list';
import { MaxContentWidth, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVehicleList } from '@/hooks/use-vehicle-list';
import { scanCertificate } from '@/utils/certificate-scan';
import {
  useVehicleAdminForm,
  type CompartmentForm,
  type LoadStatus,
  type SaveStatus,
} from '@/hooks/use-vehicle-admin-form';

function loadStatusMessage(status: LoadStatus): string | null {
  switch (status) {
    case 'found':
      return 'Editing an existing vehicle — saving overwrites its record.';
    case 'not-found':
      return 'No vehicle with this reg number yet — fill in the form below to add it.';
    case 'offline':
      return "Couldn't reach the server to check this reg number — try again when online.";
    default:
      return null;
  }
}

function saveStatusMessage(status: SaveStatus, error: string | null): string | null {
  switch (status) {
    case 'saved':
      return 'Saved — this vehicle can now be looked up in the calculator.';
    case 'invalid':
      return error;
    case 'error':
      return error ? `Couldn't save: ${error}` : "Couldn't save — check your connection.";
    case 'not-configured':
      return 'Vehicle data isn’t set up for this app yet.';
    default:
      return null;
  }
}

function saveStatusColor(status: SaveStatus): ThemeColor {
  if (status === 'saved') {
    return 'positive';
  }
  return status === 'invalid' || status === 'error' ? 'negative' : 'textSecondary';
}

function compartmentsTitle(compartments: CompartmentForm[]): string {
  const totalLiters = compartments.reduce((sum, compartment) => sum + (Number(compartment.nominalCapacityLiters) || 0), 0);
  const count = `Compartments (${compartments.length})`;
  return totalLiters > 0 ? `${count} · ${totalLiters.toLocaleString()} L total` : count;
}

// Wide enough for the sidebar beside a comfortably wide form.
const WIDE_LAYOUT_MIN_WIDTH = 1080;
const SIDEBAR_WIDTH = 340;

export default function AdminVehiclesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_LAYOUT_MIN_WIDTH;
  const form = useVehicleAdminForm();
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [hasScan, setHasScan] = useState(false);
  const vehicleList = useVehicleList();
  const scrollRef = useRef<ScrollView>(null);
  const formY = useRef(0);

  // A save may add a new vehicle or change an expiry date shown in the list.
  // Read refresh through a ref so this fires once per save, not again each
  // time the search text (and so the refresh function) changes.
  const refreshListRef = useRef(vehicleList.refresh);
  refreshListRef.current = vehicleList.refresh;
  useEffect(() => {
    if (form.saveStatus === 'saved') {
      refreshListRef.current();
    }
  }, [form.saveStatus]);

  const onSelectVehicle = (regNumber: string) => {
    setHasScan(false);
    setScanError(null);
    form.loadExisting(regNumber);
    scrollRef.current?.scrollTo({ y: formY.current, animated: true });
  };

  const onScan = async () => {
    setIsScanning(true);
    setScanError(null);
    const outcome = await scanCertificate();
    setIsScanning(false);
    if (outcome.status === 'ok') {
      setHasScan(true);
      await form.applyScan(outcome.scan);
    } else if (outcome.status === 'error') {
      setScanError(outcome.message);
    }
  };

  const onNewVehicle = () => {
    setHasScan(false);
    setScanError(null);
    form.startNewVehicle();
  };

  const onLoad = () => {
    setHasScan(false);
    form.loadExisting();
  };

  const vehicleListProps = {
    list: vehicleList,
    selectedRegNumber: form.loadStatus === 'found' ? form.regNumberInput : '',
    onSelect: onSelectVehicle,
  };

  const isLoading = form.loadStatus === 'loading';
  const isSaving = form.saveStatus === 'saving';
  const hasRegNumber = Boolean(form.regNumberInput.trim());
  const canLoad = !isLoading && hasRegNumber;
  const canSave = !isSaving && hasRegNumber;
  const loadMessage = loadStatusMessage(form.loadStatus);
  const saveMessage = saveStatusMessage(form.saveStatus, form.saveError) ?? (hasRegNumber ? null : 'Enter a reg number to save.');

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Wide screens: the list is a full-height sidebar with its own scroll;
          phones: a capped, collapsible card above the form. Either way it
          never pushes the form down as vehicles are added. */}
      <View style={styles.layout}>
        {isWide ? (
          <View style={[styles.sidebarColumn, { borderRightColor: theme.border, paddingTop: insets.top }]}>
            <VehicleList {...vehicleListProps} variant="sidebar" />
          </View>
        ) : null}
        <View style={styles.flex}>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top }]}>
            <ThemedView style={styles.container}>
              <NavButton label="← Back to calculator" href="/" />
              <ThemedText type="title" style={styles.title}>
                Vehicle Records
              </ThemedText>

              <ThemedView style={isWide ? styles.introRow : styles.introStacked}>
                <View style={styles.introButtons}>
                  <Pressable
                    onPress={onScan}
                    disabled={isScanning}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      { backgroundColor: theme.accent },
                      (pressed || isScanning) && styles.buttonPressed,
                    ]}>
                    <ThemedText type="smallBold" style={styles.saveButtonText}>
                      {isScanning ? 'Reading certificate…' : 'Scan Certificate'}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={onNewVehicle}
                    disabled={isScanning}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      styles.outlinedButton,
                      { backgroundColor: theme.surface, borderColor: theme.inputBorder },
                      pressed && styles.buttonPressed,
                    ]}>
                    <ThemedText type="smallBold">+ New Vehicle</ThemedText>
                  </Pressable>
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={isWide ? styles.introText : undefined}>
                  {`Scan a photo or PDF of the calibration certificate to fill the form, or type the details in. To edit a saved vehicle, tap it in the list ${isWide ? 'on the left' : 'below'}.`}
                </ThemedText>
              </ThemedView>

              {isScanning ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Reading the certificate — this can take up to a minute.
                </ThemedText>
              ) : null}
              {scanError ? (
                <ThemedText type="small" themeColor="negative">
                  {scanError}
                </ThemedText>
              ) : null}
              {hasScan && !isScanning ? (
                <ThemedView type="warningBackground" style={styles.scanBanner}>
                  <ThemedText type="smallBold" themeColor="warning">
                    Filled from the certificate — check every value against it before saving.
                  </ThemedText>
                  {form.scanWarnings.map((warning) => (
                    <ThemedText key={warning} type="small" themeColor="warning">
                      {`• ${warning}`}
                    </ThemedText>
                  ))}
                </ThemedView>
              ) : null}

              {isWide ? null : <VehicleList {...vehicleListProps} variant="compact" />}

              <View
                style={styles.formAnchor}
                onLayout={(event) => {
                  formY.current = event.nativeEvent.layout.y;
                }}
              />

              <SectionCard title={form.loadStatus === 'found' ? 'Vehicle — editing existing record' : 'Vehicle'}>
                <View style={styles.regRow}>
                  <LabeledTextInput
                    label="Reg. Number"
                    value={form.regNumberInput}
                    onChangeText={form.setRegNumberInput}
                    placeholder="e.g. GN5285-26"
                    autoCapitalize="characters"
                    compact
                  />
                  <Pressable
                    onPress={onLoad}
                    disabled={!canLoad}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      { backgroundColor: theme.backgroundSelected },
                      (pressed || !canLoad) && styles.buttonPressed,
                    ]}>
                    <ThemedText type="smallBold">{isLoading ? 'Loading…' : 'Load'}</ThemedText>
                  </Pressable>
                </View>

                {loadMessage ? (
                  <ThemedText type="small" themeColor={form.loadStatus === 'offline' ? 'warning' : 'textSecondary'}>
                    {loadMessage}
                  </ThemedText>
                ) : null}

                <View style={isWide ? styles.fieldRow : styles.fieldStack}>
                  <View style={isWide ? styles.field : undefined}>
                    <LabeledTextInput label="Cert No" value={form.certNoInput} onChangeText={form.setCertNoInput} />
                  </View>
                  <View style={isWide ? styles.field : undefined}>
                    <LabeledTextInput label="Bulk No" value={form.bulkNoInput} onChangeText={form.setBulkNoInput} />
                  </View>
                  <View style={isWide ? styles.field : undefined}>
                    <LabeledTextInput
                      label="Expiry Date"
                      value={form.expiryDateInput}
                      onChangeText={form.setExpiryDateInput}
                      placeholder="YYYY-MM-DD"
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
              </SectionCard>

              <SectionCard title={compartmentsTitle(form.compartments)}>
                {form.compartments.map((compartment, index) => (
                  <VehicleCompartmentEditor
                    key={compartment.key}
                    index={index}
                    nominalCapacityLiters={compartment.nominalCapacityLiters}
                    onChangeNominalCapacityLiters={(text) => form.setNominalCapacity(index, text)}
                    points={compartment.points}
                    onChangePoint={(pointIndex, patch) => form.setPoint(index, pointIndex, patch)}
                    onAddPoint={() => form.addPoint(index)}
                    onRemovePoint={(pointIndex) => form.removePoint(index, pointIndex)}
                    onReplacePoints={(points) => form.replacePoints(index, points)}
                    onRemoveCompartment={() => form.removeCompartment(index)}
                    removable={form.compartments.length > 1}
                    // Loaded compartments start collapsed to their summary line;
                    // scanned ones open so every value gets checked, and new
                    // empty ones open ready for input.
                    initiallyExpanded={hasScan || !compartment.points.some((point) => point.ullageCm.trim())}
                  />
                ))}
                <Pressable
                  onPress={form.addCompartment}
                  style={({ pressed }) => [
                    styles.addCompartmentButton,
                    { borderColor: theme.accent },
                    pressed && styles.buttonPressed,
                  ]}>
                  <ThemedText type="smallBold" themeColor="accent">
                    + Add Compartment
                  </ThemedText>
                </Pressable>
              </SectionCard>
            </ThemedView>
          </ScrollView>

          {/* Outside the ScrollView so Save stays reachable below long calibration tables. */}
          <ThemedView
            type="surface"
            style={[styles.footer, { borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.two }]}>
            <View style={styles.footerInner}>
              <ThemedText type="small" themeColor={saveStatusColor(form.saveStatus)} style={styles.footerMessage}>
                {saveMessage ?? ''}
              </ThemedText>
              <Pressable
                onPress={form.save}
                disabled={!canSave}
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: theme.accent },
                  (pressed || !canSave) && styles.buttonPressed,
                ]}>
                <ThemedText type="smallBold" style={styles.saveButtonText}>
                  {isSaving ? 'Saving…' : 'Save Vehicle'}
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </View>
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
    paddingVertical: Spacing.four,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  // Phones stack the helper text under the buttons; wide screens put it
  // beside them. Chosen explicitly rather than with flex-wrap, which native iOS
  // (Yoga) and browsers resolve differently.
  introStacked: {
    gap: Spacing.three,
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarColumn: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
  },
  formAnchor: {
    // Zero-height marker the list scrolls to; the container's gap still
    // applies, so pull it up to sit just above the form card.
    marginTop: -Spacing.four,
  },
  introButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  scanBanner: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  introText: {
    flex: 1,
  },
  regRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  // Cert No / Bulk No / Expiry Date: stacked on phones, three across on wide
  // screens — explicit for the same reason as the intro above.
  fieldStack: {
    gap: Spacing.two,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  field: {
    flex: 1,
  },
  secondaryButton: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  outlinedButton: {
    borderWidth: 1,
  },
  addCompartmentButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.6,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  footerInner: {
    maxWidth: MaxContentWidth,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  footerMessage: {
    flex: 1,
  },
  saveButton: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
});
