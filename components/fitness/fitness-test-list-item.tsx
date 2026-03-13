import type { FitnessTest } from "@/components/fitness/edit-fitness-test-modal";
import { cn, formatDate } from "@/lib/utils";

export interface FitnessTestSummary extends FitnessTest {
	latestSessionDate?: number;
	latestSessionResultCount: number;
}

interface FitnessTestListItemProps {
	fitnessTest: FitnessTestSummary;
	isSelected: boolean;
	onSelect: () => void;
}

export const FitnessTestListItem = ({
	fitnessTest,
	isSelected,
	onSelect,
}: FitnessTestListItemProps): React.JSX.Element => {
	const latestSessionLabel = fitnessTest.latestSessionDate
		? `Last session ${formatDate(fitnessTest.latestSessionDate)} · ${fitnessTest.latestSessionResultCount} players`
		: "No results yet";

	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"w-full border-b border-[#cbdbcc] px-5 py-4 text-left",
				isSelected
					? "bg-white border-l-[3px] border-l-[#298a29]"
					: "bg-transparent",
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-[#021e00] text-[28px] leading-none font-medium md:text-lg">
						{fitnessTest.name}
					</p>
					<p className="mt-2 text-xs text-[#6c866d]">{latestSessionLabel}</p>
				</div>
				{isSelected && (
					<span className="bg-[#edf6ed] px-2 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase text-[#298a29]">
						Selected
					</span>
				)}
			</div>
		</button>
	);
};
