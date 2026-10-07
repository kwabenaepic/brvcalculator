import { SectionCard } from '@/components/transit-loss/section-card';
import { SummaryRow } from '@/components/transit-loss/summary-row';
import { TempDensityRow } from '@/components/transit-loss/temp-density-row';
import type { TransitLossSummary } from '@/utils/transit-loss';

export type VcfSectionProps = {
  loadedTemperatureInput: string;
  onChangeLoadedTemperature: (text: string) => void;
  loadedDensityInput: string;
  onChangeLoadedDensity: (text: string) => void;
  receivedTemperatureInput: string;
  onChangeReceivedTemperature: (text: string) => void;
  receivedDensityInput: string;
  onChangeReceivedDensity: (text: string) => void;
  summary: TransitLossSummary;
};

function formatVcf(vcf: number | null): string | null {
  return vcf === null ? null : vcf.toFixed(4);
}

export function VcfSection({
  loadedTemperatureInput,
  onChangeLoadedTemperature,
  loadedDensityInput,
  onChangeLoadedDensity,
  receivedTemperatureInput,
  onChangeReceivedTemperature,
  receivedDensityInput,
  onChangeReceivedDensity,
  summary,
}: VcfSectionProps) {
  return (
    <SectionCard title="Volume Correction (15°C)">
      <TempDensityRow
        label="Loaded"
        temperatureValue={loadedTemperatureInput}
        onChangeTemperature={onChangeLoadedTemperature}
        densityValue={loadedDensityInput}
        onChangeDensity={onChangeLoadedDensity}
      />
      <SummaryRow label="Loaded VCF" value={formatVcf(summary.loadedVcf)} />
      <SummaryRow label="Loaded Volume @15°C" value={summary.loadedVolumeAt15} unit="L" />

      <TempDensityRow
        label="Received"
        temperatureValue={receivedTemperatureInput}
        onChangeTemperature={onChangeReceivedTemperature}
        densityValue={receivedDensityInput}
        onChangeDensity={onChangeReceivedDensity}
      />
      <SummaryRow label="Received VCF" value={formatVcf(summary.receivedVcf)} />
      <SummaryRow label="Received Volume @15°C" value={summary.receivedVolumeAt15} unit="L" />
      <SummaryRow label="Loss @15°C" value={summary.lossAt15} unit="L" emphasize />
    </SectionCard>
  );
}
