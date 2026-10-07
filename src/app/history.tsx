import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavButton } from '@/components/nav-button';
import { HistoryRecordCard } from '@/components/transit-loss/history-record-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePendingRecords } from '@/hooks/use-pending-records';
import { useTransitLossRecords } from '@/hooks/use-transit-loss-history';
import { mapRow, recordMatchesSearch } from '@/utils/history';

function emptyStateMessage(listStatus: string, isSearching: boolean): string {
  switch (listStatus) {
    case 'loading':
      return isSearching ? 'Searching…' : 'Loading…';
    case 'error':
      return "Couldn't load history — check your connection.";
    case 'not-configured':
      return 'History isn’t set up for this app yet.';
    default:
      return isSearching ? 'No saved calculations match this search.' : 'No saved calculations yet.';
  }
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { records, total, listStatus, search, setSearch, loadMore, isLoadingMore, hasMore, refresh } =
    useTransitLossRecords();
  const { pending, isUploading, uploadNow } = usePendingRecords();
  const isSearching = search.trim() !== '';

  // When queued records finish uploading, reload so they appear in the list.
  const previousPendingCount = useRef(pending.length);
  useEffect(() => {
    if (pending.length < previousPendingCount.current) {
      refresh();
    }
    previousPendingCount.current = pending.length;
  }, [pending.length, refresh]);

  // A record can briefly be both uploaded and still queued; show it once.
  const uploadedIds = new Set(records.map((record) => record.id));
  const waiting = pending.filter(
    (record) => !uploadedIds.has(record.row.id) && recordMatchesSearch(mapRow(record.row), search),
  );

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.three },
      ]}>
      <ThemedView style={styles.container}>
        <NavButton label="← Back to calculator" href="/" />
        <ThemedText type="title" style={styles.title}>
          History
        </ThemedText>

        {listStatus === 'not-configured' ? null : (
          <TextInput
            style={[styles.search, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.inputBorder }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search reg number, cert no or bulk no"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
            clearButtonMode="while-editing"
            accessibilityLabel="Search history"
          />
        )}

        {waiting.length > 0 ? (
          <View style={styles.pendingSection}>
            <View style={styles.pendingHeader}>
              <ThemedText type="smallBold" style={styles.flex}>
                {`Waiting to upload (${waiting.length})`}
              </ThemedText>
              <Pressable
                onPress={uploadNow}
                disabled={isUploading}
                style={({ pressed }) => [
                  styles.uploadButton,
                  { backgroundColor: theme.accent },
                  (pressed || isUploading) && styles.buttonPressed,
                ]}>
                <ThemedText type="smallBold" style={styles.uploadButtonText}>
                  {isUploading ? 'Uploading…' : 'Upload now'}
                </ThemedText>
              </Pressable>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Saved on this device while offline. They upload automatically when you’re back online.
            </ThemedText>
            {waiting.map((record) => (
              <HistoryRecordCard
                key={record.row.id}
                record={mapRow(record.row)}
                note={
                  record.lastError
                    ? { text: `Upload refused: ${record.lastError}`, tone: 'negative' }
                    : { text: 'Not uploaded yet', tone: 'warning' }
                }
              />
            ))}
          </View>
        ) : null}

        {records.length === 0 ? (
          // "No saved calculations yet" would be wrong with records waiting above.
          waiting.length > 0 && listStatus === 'loaded' ? null : (
            <ThemedText type="small" themeColor="textSecondary">
              {emptyStateMessage(listStatus, isSearching)}
            </ThemedText>
          )
        ) : (
          <>
            {isSearching ? (
              <ThemedText type="small" themeColor="textSecondary">
                {total === 1 ? '1 matching record' : `${total} matching records`}
              </ThemedText>
            ) : null}
            {records.map((record) => (
              <HistoryRecordCard key={record.id} record={record} />
            ))}
            {hasMore ? (
              <Pressable
                onPress={loadMore}
                disabled={isLoadingMore}
                style={({ pressed }) => [
                  styles.loadMoreButton,
                  { borderColor: theme.border, backgroundColor: theme.surface },
                  (pressed || isLoadingMore) && styles.buttonPressed,
                ]}>
                <ThemedText type="smallBold">
                  {isLoadingMore ? 'Loading…' : `Load more (${total - records.length} older)`}
                </ThemedText>
              </Pressable>
            ) : null}
          </>
        )}
      </ThemedView>
    </ScrollView>
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
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  search: {
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    fontSize: 16,
  },
  loadMoreButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingVertical: Spacing.two,
  },
  pendingSection: {
    gap: Spacing.two,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  uploadButton: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  uploadButtonText: {
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.6,
  },
});
