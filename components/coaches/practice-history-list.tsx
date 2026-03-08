import type { Doc } from "@/convex/_generated/dataModel";
import { formatMonthDay, getPracticeTitle } from "@/lib/utils";

export function PracticeHistoryList({
	practices,
	selectedCoachId,
	showAll,
	onToggleShowAll,
}: {
	practices: (Doc<"practices"> & {
		practiceCoaches: Doc<"practiceCoaches">[];
	})[];
	selectedCoachId: string;
	showAll: boolean;
	onToggleShowAll: (show: boolean) => void;
}) {
	const displayedPractices = showAll ? practices : practices.slice(0, 5);
	const moreCount = practices.length - displayedPractices.length;

	return (
		<div className="divide-y divide-[#cbdbcc]">
			{displayedPractices.length === 0 ? (
				<div className="px-6 py-12 text-center">
					<p className="text-[#8aab8a] text-sm">No practices recorded</p>
				</div>
			) : (
				displayedPractices.map((practice) => {
					const pc = practice.practiceCoaches.find(
						(x) => x.coachId === selectedCoachId,
					);
					const hrs = pc ? pc.durationMinutes / 60 : 1.5;
					return (
						<div
							key={practice._id}
							className="flex items-center justify-between px-5 md:px-6 py-4"
						>
							<div>
								<p className="text-[#021e00] font-medium text-sm">
									{getPracticeTitle(practice)}
								</p>
								<p className="text-[#4a8a40] text-xs mt-0.5">
									{formatMonthDay(practice.date)}
								</p>
							</div>
							<p className="text-[#8aab8a] text-sm font-medium">
								{hrs.toFixed(1)} hrs
							</p>
						</div>
					);
				})
			)}
			{!showAll && moreCount > 0 && (
				<button
					type="button"
					className="w-full text-left px-5 md:px-6 py-4 hover:bg-[#eef4f1]"
					onClick={() => onToggleShowAll(true)}
				>
					<p className="text-[#298a29] text-sm font-medium">
						+ {moreCount} more practices
					</p>
				</button>
			)}
			{showAll && practices.length > 5 && (
				<button
					type="button"
					className="w-full text-left px-5 md:px-6 py-4 hover:bg-[#eef4f1]"
					onClick={() => onToggleShowAll(false)}
				>
					<p className="text-[#8aab8a] text-sm font-medium">Show less</p>
				</button>
			)}
		</div>
	);
}
