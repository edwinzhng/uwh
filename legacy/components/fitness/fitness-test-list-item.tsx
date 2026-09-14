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
		? `Last: ${formatDate(fitnessTest.latestSessionDate)} · ${fitnessTest.latestSessionResultCount} players`
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
			<div>
				<p className="text-[#021e00] text-[28px] leading-none font-medium md:text-lg">
					{fitnessTest.name}
				</p>
				<p className="mt-2 text-xs text-[#6c866d]">{latestSessionLabel}</p>
			</div>
		</button>
	);
};
