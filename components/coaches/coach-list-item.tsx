import { Avatar } from "@/components/ui/avatar";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

export function CoachListItem({
	coach,
	hrs,
	practiceCount,
	isActive,
	onClick,
}: {
	coach: Doc<"coaches"> & { player?: Doc<"players"> | null };
	hrs: number;
	practiceCount: number;
	isActive: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"w-full text-left px-5 py-5",
				isActive ? "bg-[#cbdbcc]" : "hover:bg-[#eef4f1]",
			)}
		>
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-3">
					<Avatar
						name={coach.player?.fullName ?? ""}
						size="lg"
						bgClass={isActive ? "bg-[#021e00]" : undefined}
						textClass={isActive ? "text-[#eef4f1]" : undefined}
					/>
					<div>
						<p className="text-[#021e00] font-semibold text-base">
							{coach.player?.fullName || "Unknown Player"}
						</p>
					</div>
				</div>
				<div className="text-right">
					<p className="text-[#298a29] text-2xl font-bold leading-none">
						{hrs.toFixed(1).split(".")[0]}
						<span className="text-sm">.</span>
						{hrs.toFixed(1).split(".")[1]}
					</p>
					<p className="text-[#8aab8a] text-[10px] tracking-[0.1em] uppercase">
						Hours
					</p>
				</div>
			</div>
			<div className="mt-2.5">
				<span className="inline-flex items-center px-2 py-1 bg-[#298a29] text-white text-[10px] font-semibold tracking-[0.08em] uppercase">
					{practiceCount} Practices
				</span>
			</div>
		</button>
	);
}
