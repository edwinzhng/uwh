"use client";

import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Id } from "@/convex/_generated/dataModel";

const PLAYER_COLORS = [
	"#298a29",
	"#2563eb",
	"#d97706",
	"#dc2626",
	"#7c3aed",
	"#0891b2",
	"#be185d",
	"#059669",
];

type MonthGroup = {
	key: string;
	label: string;
	practiceIds: Id<"practices">[];
};

type AttendancePlayer = {
	_id: Id<"players">;
	fullName: string;
	youth?: boolean;
	attendance: Array<{
		practiceId: Id<"practices">;
		attended: boolean | null;
	}>;
};

interface AttendanceComparisonModalProps {
	players: AttendancePlayer[];
	months: MonthGroup[];
	onClose: () => void;
}

export function AttendanceComparisonModal({
	players,
	months,
	onClose,
}: AttendanceComparisonModalProps) {
	const isOpen = players.length > 0;

	const chartData = months.map((month) => {
		const row: Record<string, string | number | null> = { month: month.label };
		for (const player of players) {
			const total = month.practiceIds.length;
			if (total === 0) {
				row[player.fullName] = null;
			} else {
				const attended = month.practiceIds.filter(
					(pid) =>
						player.attendance.find((a) => a.practiceId === pid)?.attended ===
						true,
				).length;
				row[player.fullName] = Math.round((attended / total) * 100);
			}
		}
		return row;
	});

	const title = (() => {
		if (players.length === 0) return "Compare Players";
		if (players.length === 2)
			return players.map((p) => p.fullName).join(" vs ");
		return `Comparing ${players.length} players`;
	})();

	function renderTooltip(props: {
		active?: boolean;
		payload?: Array<{ name: string; value: number | null; color: string }>;
		label?: string;
	}) {
		if (!props.active || !props.payload || props.payload.length === 0)
			return null;
		return (
			<div className="border border-[#cbdbcc] bg-white px-3 py-2 shadow-sm text-xs">
				<p className="text-[#6c866d] mb-1">{props.label}</p>
				{props.payload.map((entry) => {
					if (entry.value == null) return null;
					return (
						<p
							key={entry.name}
							className="font-semibold"
							style={{ color: entry.color }}
						>
							{entry.name}: {entry.value}%
						</p>
					);
				})}
			</div>
		);
	}
	// biome-ignore lint/suspicious/noExplicitAny: Recharts v3 tooltip content type is overly strict
	const tooltipContent = renderTooltip as any;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent
				title={title}
				subtitle="Attendance Comparison"
				className="sm:max-w-3xl"
			>
				<div className="p-6">
					{players.length === 0 ? (
						<p className="text-sm text-[#6c866d]">No players selected.</p>
					) : months.length === 0 ? (
						<p className="text-sm text-[#6c866d]">
							No practice data available.
						</p>
					) : (
						<>
							<p className="text-xs text-[#8aab8a] mb-4">
								Monthly attendance rate (%)
							</p>
							<div className="bg-white border border-[#cbdbcc] p-3">
								<ResponsiveContainer width="100%" height={260}>
									<LineChart
										data={chartData}
										margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
									>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="#cbdbcc"
											vertical={false}
										/>
										<XAxis
											dataKey="month"
											tick={{ fontSize: 10, fill: "#8aab8a" }}
											axisLine={false}
											tickLine={false}
											dy={6}
										/>
										<YAxis
											domain={[0, 100]}
											tickFormatter={(v) => `${v}%`}
											tick={{ fontSize: 10, fill: "#8aab8a" }}
											axisLine={false}
											tickLine={false}
											width={34}
										/>
										<Tooltip content={tooltipContent} />
										<Legend
											wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
											formatter={(value) => (
												<span style={{ color: "#021e00" }}>{value}</span>
											)}
										/>
										{players.map((player, i) => (
											<Line
												key={player._id}
												type="monotone"
												dataKey={player.fullName}
												stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
												strokeWidth={2}
												dot={{
													fill: PLAYER_COLORS[i % PLAYER_COLORS.length],
													r: 3,
													strokeWidth: 0,
												}}
												activeDot={{
													fill: PLAYER_COLORS[i % PLAYER_COLORS.length],
													r: 4,
													strokeWidth: 0,
												}}
												connectNulls={false}
											/>
										))}
									</LineChart>
								</ResponsiveContainer>
							</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
