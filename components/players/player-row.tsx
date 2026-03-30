import { Avatar } from "@/components/ui/avatar";
import { Badge, PositionBadge } from "@/components/ui/badge";
import type { Doc } from "@/convex/_generated/dataModel";

export type Player = Doc<"players">;

export function PlayerRow({
	player,
	onEdit,
}: {
	player: Player;
	onEdit: () => void;
}) {
	return (
		<>
			{/* Desktop */}
			<div className="hidden md:grid grid-cols-[1fr_200px_120px_80px] px-6 py-4 border-b border-[#cbdbcc] items-center hover:bg-white/30">
				{/* Name */}
				<div className="flex items-center gap-3">
					<Avatar name={player.fullName} size="sm" />
					<div>
						<div className="flex items-center gap-2">
							<p className="text-[#021e00] font-medium text-sm">
								{player.fullName}
							</p>
							{player.youth && <Badge variant="youth">Youth</Badge>}
						</div>
						<p className="text-[#8aab8a] text-xs mt-0.5">
							{player.email || player.parentEmail || ""}
						</p>
					</div>
				</div>

				{/* Rating + positions */}
				<div className="flex items-center gap-2">
					<span className="text-[#021e00] text-lg font-bold">
						{player.rating}
					</span>
					<span className="text-[#8aab8a] text-xs">/100</span>
					<div className="flex gap-1 ml-2">
						{player.positions.map((pos) => (
							<PositionBadge key={pos} position={pos} />
						))}
					</div>
				</div>

				{/* Type */}
				<div>
					<span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#8aab8a]">
						{player.youth ? "Youth" : "Adult"}
					</span>
				</div>

				{/* Edit */}
				<div className="flex justify-end">
					<button
						type="button"
						onClick={onEdit}
						className="h-8 px-3 border border-[#cbdbcc] text-[#021e00] text-xs font-semibold tracking-[0.08em] uppercase hover:border-[#021e00] hover:bg-[#021e00] hover:text-[#eef4f1]"
					>
						Edit
					</button>
				</div>
			</div>

			{/* Mobile */}
			<div className="md:hidden flex items-center px-4 py-4 border-b border-[#cbdbcc] hover:bg-white/20">
				<Avatar
					name={player.fullName}
					size="sm"
					className="mr-3 flex-shrink-0"
				/>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-1.5 flex-wrap">
						<p className="text-[#021e00] font-medium text-sm">
							{player.fullName}
						</p>
						{player.youth && <Badge variant="youth">Youth</Badge>}
					</div>
					<div className="flex gap-1 mt-1">
						{player.positions.map((pos) => (
							<PositionBadge key={pos} position={pos} />
						))}
					</div>
				</div>
				<div className="flex items-center gap-3 ml-2">
					<div className="text-right">
						<span className="text-[#021e00] font-bold">{player.rating}</span>
						<span className="text-[#8aab8a] text-xs">/100</span>
					</div>
					<button
						type="button"
						onClick={onEdit}
						className="h-8 px-3 border border-[#cbdbcc] text-[#021e00] text-xs font-semibold tracking-[0.08em] uppercase"
					>
						Edit
					</button>
				</div>
			</div>
		</>
	);
}
