import { SectionCard } from '@/components/transit-loss/section-card';
import { SummaryRow } from '@/components/transit-loss/summary-row';
import type { TransitLossSummary } from '@/utils/transit-loss';

export type TotalsSectionProps = {
  summary: TransitLossSummary;
};

export function TotalsSection({ summary }: TotalsSectionProps) {
  return (
    <SectionCard title="Totals">
      <SummaryRow label="Total Loaded" value={summary.totalLoaded} unit="L" />
      <SummaryRow label="Total Received" value={summary.totalReceived} unit="L" />
      <SummaryRow
        label="Observed Difference"
        value={summary.observedDiff}
        unit="L"
        emphasize
        colorBySign
      />
    </SectionCard>
  );
}
