import { CompartmentRow } from '@/components/transit-loss/compartment-row';
import { SectionCard } from '@/components/transit-loss/section-card';
import { ThemedText } from '@/components/themed-text';
import type { CompartmentCalibration } from '@/utils/vehicle-lookup';

export type CompartmentsSectionProps = {
  compartments: CompartmentCalibration[];
  loadedUllageValues: string[];
  onChangeLoadedUllage: (index: number, text: string) => void;
  loadedVolumes: (number | null)[];
  receivedUllageValues: string[];
  onChangeReceivedUllage: (index: number, text: string) => void;
  receivedVolumes: (number | null)[];
};

export function CompartmentsSection({
  compartments,
  loadedUllageValues,
  onChangeLoadedUllage,
  loadedVolumes,
  receivedUllageValues,
  onChangeReceivedUllage,
  receivedVolumes,
}: CompartmentsSectionProps) {
  return (
    <SectionCard title="Compartments">
      {compartments.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Look up a vehicle to see its compartments.
        </ThemedText>
      ) : (
        compartments.map((compartment, index) => (
          <CompartmentRow
            key={compartment.id}
            index={compartment.id}
            nominalCapacityLiters={compartment.nominalCapacityLiters}
            loadedUllage={loadedUllageValues[index]}
            onChangeLoadedUllage={(text) => onChangeLoadedUllage(index, text)}
            loadedVolume={loadedVolumes[index]}
            receivedUllage={receivedUllageValues[index]}
            onChangeReceivedUllage={(text) => onChangeReceivedUllage(index, text)}
            receivedVolume={receivedVolumes[index]}
          />
        ))
      )}
    </SectionCard>
  );
}
