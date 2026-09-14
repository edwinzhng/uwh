import type { Doc } from "@/convex/_generated/dataModel";
import {
	type FitnessTestUnit,
	fitnessTestUnits,
	normalizeFitnessResultValue,
	type PassFailResultValue,
	passFailResultValues,
	sanitizeFitnessResultInput,
} from "@/lib/fitness";
import { cn, getInitials } from "@/lib/utils";

export interface FitnessResultDraft {
	value: string;
}

interface FitnessResultRowProps {
	bestResult: string;
	draft: FitnessResultDraft;
	layout: "desktop" | "mobile";
	onValueChange: (value: string) => void;
	player: Doc<"players">;
	unit: FitnessTestUnit;
}

const passFailOptions: Array<{ label: string; value: PassFailResultValue }> = [
	{ label: "Pass", value: passFailResultValues.PASS },
	{ label: "Fail", value: passFailResultValues.FAIL },
];

const renderValueControl = ({
	draft,
	layout,
	onValueChange,
	unit,
}: Pick<
	FitnessResultRowProps,
	"draft" | "layout" | "onValueChange" | "unit"
>): React.JSX.Element => {
	if (unit === fitnessTestUnits.PASS_FAIL) {
		return (
			<div
				className={cn(
					"inline-flex overflow-hidden border border-[#cbdbcc]",
					layout === "desktop" ? "w-full max-w-[160px]" : "w-full",
				)}
			>
				{passFailOptions.map((option) => (
					<button
						key={option.value}
						type="button"
						onClick={() =>
							onValueChange(draft.value === option.value ? "" : option.value)
						}
						className={cn(
							"flex-1 px-3 py-2 text-xs font-semibold tracking-[0.08em] uppercase",
							draft.value === option.value
								? "bg-[#021e00] text-[#eef4f1]"
								: "bg-white text-[#021e00] hover:bg-[#eef4f1]",
						)}
					>
						{option.label}
					</button>
				))}
			</div>
		);
	}

	return (
		<input
			value={draft.value}
			onBlur={(event) =>
				onValueChange(normalizeFitnessResultValue(unit, event.target.value))
			}
			onChange={(event) =>
				onValueChange(sanitizeFitnessResultInput(unit, event.target.value))
			}
			placeholder={unit === fitnessTestUnits.TIME ? "e.g. 5:24" : "e.g. 42"}
			inputMode="numeric"
			className={cn(
				"h-10 border px-3 text-[#021e00] focus:outline-none focus:border-[#298a29]",
				layout === "desktop" ? "w-full max-w-[160px]" : "w-full",
				draft.value
					? "border-[#298a29] bg-[#f9fff9]"
					: "border-[#cbdbcc] bg-white",
			)}
		/>
	);
};

export const FitnessResultRow = ({
	bestResult,
	draft,
	layout,
	onValueChange,
	player,
	unit,
}: FitnessResultRowProps): React.JSX.Element => {
	if (layout === "mobile") {
		return (
			<div className="border-b border-[#cbdbcc] bg-white px-4 py-4">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#dde6dd] text-sm text-[#284628]">
						{getInitials(player.fullName)}
					</div>
					<div>
						<p className="text-sm font-medium text-[#021e00]">
							{player.fullName}
						</p>
						<p className="text-xs text-[#8aab8a]">Personal best {bestResult}</p>
					</div>
				</div>
				<div className="mt-3">
					{renderValueControl({ draft, layout, onValueChange, unit })}
				</div>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-[minmax(136px,1.16fr)_minmax(72px,0.64fr)_minmax(140px,1fr)] items-center gap-4 border-x border-b border-[#cbdbcc] bg-white px-4 py-3">
			<div className="flex min-w-0 items-center gap-3">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#dde6dd] text-sm text-[#284628]">
					{getInitials(player.fullName)}
				</div>
				<div className="min-w-0">
					<p className="truncate text-base font-medium text-[#021e00]">
						{player.fullName}
					</p>
					<p className="text-xs text-[#8aab8a]">
						{player.youth ? "Youth" : "Adult"}
					</p>
				</div>
			</div>
			<p className="text-sm font-medium text-[#021e00]">{bestResult}</p>
			<div className="min-w-0">
				{renderValueControl({ draft, layout, onValueChange, unit })}
			</div>
		</div>
	);
};
