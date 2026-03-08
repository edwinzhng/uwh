import { cn } from "@/lib/utils";

export type Season = {
	label: string;
	value: string;
	start: string;
	end: string;
};

export function SeasonPicker({
	seasons,
	currentSeason,
	onSelect,
	isOpen,
	onToggle,
}: {
	seasons: Season[];
	currentSeason: Season;
	onSelect: (s: Season) => void;
	isOpen: boolean;
	onToggle: (open: boolean) => void;
}) {
	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => onToggle(!isOpen)}
				className="h-9 px-3 border border-[#cbdbcc] text-[#021e00] text-xs font-medium hover:border-[#021e00] flex items-center gap-1"
			>
				{currentSeason.label} ▾
			</button>
			{isOpen && (
				<div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[#cbdbcc] shadow-lg min-w-[180px]">
					{seasons.map((s) => (
						<button
							key={s.value}
							type="button"
							onClick={() => {
								onSelect(s);
								onToggle(false);
							}}
							className={cn(
								"block w-full text-left px-4 py-2.5 text-sm hover:bg-[#eef4f1]",
								s.value === currentSeason.value
									? "text-[#298a29] font-medium"
									: "text-[#021e00]",
							)}
						>
							{s.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
