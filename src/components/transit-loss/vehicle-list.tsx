import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, type ThemeColor } from '@/constants/theme';
import type { useVehicleList } from '@/hooks/use-vehicle-list';
import { useTheme } from '@/hooks/use-theme';
import { DUE_SOON_DAYS, normalizeRegNumber, type ExpiryFilter } from '@/utils/vehicle-lookup';

const DAY_MS = 24 * 60 * 60 * 1000;
// In the compact (phone) layout the list scrolls inside a box this tall —
// about three and a half rows, so the cut-off row hints there's more.
const COMPACT_LIST_MAX_HEIGHT = 250;

const EXPIRY_FILTERS: { value: ExpiryFilter; label: string; color: ThemeColor }[] = [
  { value: 'all', label: 'All', color: 'text' },
  { value: 'expired', label: 'Expired', color: 'negative' },
  { value: 'due-soon', label: 'Due soon', color: 'warning' },
  { value: 'valid', label: 'Valid', color: 'positive' },
];

function expiryStatus(expiryDate: string): { label: string; color: ThemeColor } {
  const today = new Date(new Date().toISOString().slice(0, 10));
  const daysLeft = Math.round((new Date(expiryDate).getTime() - today.getTime()) / DAY_MS);
  if (daysLeft < 0) {
    return { label: `Expired ${expiryDate}`, color: 'negative' };
  }
  if (daysLeft <= DUE_SOON_DAYS) {
    // Kept short so the reg number isn't truncated in the narrow sidebar.
    return { label: daysLeft === 0 ? 'Expires today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`, color: 'warning' };
  }
  return { label: `Valid to ${expiryDate}`, color: 'positive' };
}

export type VehicleListProps = {
  list: ReturnType<typeof useVehicleList>;
  selectedRegNumber: string;
  onSelect: (regNumber: string) => void;
  /**
   * 'sidebar' fills a full-height side column and scrolls on its own (wide
   * screens); 'compact' is a capped-height, collapsible card above the form
   * (phones). Either way the list never pushes the form down as it grows.
   */
  variant: 'sidebar' | 'compact';
};

export function VehicleList({ list, selectedRegNumber, onSelect, variant }: VehicleListProps) {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const { vehicles, total, counts, status, search, expiry } = list;
  const isSidebar = variant === 'sidebar';
  const selectedKey = normalizeRegNumber(selectedRegNumber);
  const isFiltered = Boolean(search.trim()) || expiry !== 'all';
  const fleetSize = counts?.all ?? total;
  const showBody = isSidebar || isExpanded;
  const title = counts || status === 'ok' ? `Saved vehicles (${fleetSize})` : 'Saved vehicles';

  const select = (regNumber: string) => {
    onSelect(regNumber);
    // On a phone, fold the list away so the chosen vehicle's form has room.
    if (!isSidebar) {
      setIsExpanded(false);
    }
  };

  const header = (
    <View style={styles.header}>
      {isSidebar ? (
        <ThemedText type="smallBold" style={styles.flex}>
          {title}
        </ThemedText>
      ) : (
        <Pressable
          onPress={() => setIsExpanded((current) => !current)}
          style={styles.flex}
          hitSlop={Spacing.one}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}>
          <ThemedText type="smallBold">
            {`${isExpanded ? '▾' : '▸'}  ${title}`}
          </ThemedText>
          {!isExpanded && selectedKey ? (
            <ThemedText type="small" themeColor="textSecondary">{`Editing ${selectedKey} — tap to change`}</ThemedText>
          ) : null}
        </Pressable>
      )}
      <Pressable onPress={list.refresh} disabled={status === 'loading'} hitSlop={Spacing.one}>
        <ThemedText type="small" themeColor="accent">
          {status === 'loading' ? 'Loading…' : 'Refresh'}
        </ThemedText>
      </Pressable>
    </View>
  );

  const message =
    status === 'error'
      ? {
          text: 'Couldn’t load the vehicle list — check your connection and tap Refresh. If it keeps failing, run migration 0006_vehicle_summaries.sql.',
          color: 'negative' as const,
        }
      : status === 'not-configured'
        ? { text: 'Vehicle data isn’t set up for this app yet.', color: 'textSecondary' as const }
        : status === 'ok' && vehicles.length === 0
          ? {
              text: isFiltered ? 'No vehicles match this search or filter.' : 'No vehicles yet — add one with the form.',
              color: 'textSecondary' as const,
            }
          : null;

  const rows = vehicles.map((vehicle) => {
    const expiry = expiryStatus(vehicle.expiryDate);
    const isSelected = vehicle.regNumber === selectedKey;
    const isHovered = vehicle.regNumber === hoveredKey;
    return (
      <Pressable
        key={vehicle.regNumber}
        onPress={() => select(vehicle.regNumber)}
        onHoverIn={() => setHoveredKey(vehicle.regNumber)}
        onHoverOut={() => setHoveredKey((current) => (current === vehicle.regNumber ? null : current))}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${vehicle.regNumber}`}
        accessibilityState={{ selected: isSelected }}
        style={({ pressed }) => [
          styles.row,
          isSelected && styles.rowSelected,
          {
            backgroundColor: isSelected || pressed ? theme.accentBackground : theme.surface,
            borderColor: isSelected || isHovered ? theme.accent : theme.border,
          },
        ]}>
        <View style={styles.rowTop}>
          <ThemedText
            type="smallBold"
            themeColor={isSelected ? 'accent' : 'text'}
            style={styles.regNumber}
            numberOfLines={1}>
            {vehicle.regNumber}
          </ThemedText>
          {isSelected ? (
            <View style={[styles.editingBadge, { backgroundColor: theme.accent }]}>
              <ThemedText type="small" style={styles.editingBadgeText}>
                Editing
              </ThemedText>
            </View>
          ) : null}
        </View>
        {/* Status sits on the second line so the reg number and badge keep
            the full width of the first, even in the narrow sidebar. */}
        <View style={styles.rowBottom}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.details} numberOfLines={1}>
            {`${vehicle.compartmentCount} comp. · ${vehicle.totalNominalLiters.toLocaleString()} L`}
          </ThemedText>
          <ThemedText type="small" themeColor={expiry.color}>
            {expiry.label}
          </ThemedText>
        </View>
      </Pressable>
    );
  });

  // Search and status filters are always available, on phones as well as the sidebar.
  const tools = status === 'not-configured' ? null : (
    <>
      <TextInput
        style={[styles.search, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.inputBorder }]}
        value={search}
        onChangeText={list.setSearch}
        placeholder="Search reg number"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <View style={styles.chips}>
        {EXPIRY_FILTERS.map((filter) => {
          const isActive = expiry === filter.value;
          const count = counts?.[filter.value];
          return (
            <Pressable
              key={filter.value}
              onPress={() => list.setExpiry(filter.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? theme.accentBackground : theme.surface,
                  borderColor: isActive ? theme.accent : theme.border,
                },
              ]}>
              <ThemedText type="small" themeColor={isActive ? 'accent' : filter.color}>
                {count === undefined ? filter.label : `${filter.label} ${count}`}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  const footer =
    status === 'ok' && vehicles.length > 0 && (list.hasMore || isFiltered) ? (
      <View style={styles.footer}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
          {`Showing ${vehicles.length} of ${total}`}
        </ThemedText>
        {list.hasMore ? (
          <Pressable onPress={list.loadMore} disabled={list.isLoadingMore} hitSlop={Spacing.one}>
            <ThemedText type="smallBold" themeColor="accent">
              {list.isLoadingMore ? 'Loading…' : 'Load more'}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    ) : null;

  const body = showBody ? (
    <>
      {tools}
      {message ? (
        <ThemedText type="small" themeColor={message.color}>
          {message.text}
        </ThemedText>
      ) : null}
      <ScrollView
        style={isSidebar ? styles.flex : { maxHeight: COMPACT_LIST_MAX_HEIGHT }}
        contentContainerStyle={styles.list}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled">
        {rows}
        {footer}
      </ScrollView>
    </>
  ) : null;

  return (
    <ThemedView type={isSidebar ? 'background' : 'surface'} style={isSidebar ? styles.sidebar : [styles.card, { borderColor: theme.border }]}>
      {header}
      {body}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sidebar: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  search: {
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    fontSize: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one - 1,
  },
  // Tight enough that all four filters fit on one line in the sidebar.
  chip: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.one + 1,
    paddingVertical: Spacing.half,
  },
  list: {
    gap: Spacing.two,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  row: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  // A thick left edge marks the vehicle being edited; padding shrinks by the
  // extra border width so the text doesn't shift when a row is selected.
  rowSelected: {
    borderLeftWidth: Spacing.one,
    paddingLeft: Spacing.three - (Spacing.one - 1),
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  regNumber: {
    flexShrink: 1,
  },
  details: {
    flex: 1,
  },
  editingBadge: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.one + Spacing.half,
  },
  editingBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
});
