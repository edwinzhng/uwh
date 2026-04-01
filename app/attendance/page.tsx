"use client";

import { useAction, useQuery } from "convex/react";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Season = {
	label: string;
	start: number;
	end: number;
};

const SEASONS: Season[] = [
	{
		label: "2025–26",
		start: new Date("2025-09-01").getTime(),
		end: new Date("2026-09-01").getTime(),
	},
];

type MonthGroup = {
	key: string; // "2025-09"
	label: string; // "Sep"
	practiceIds: Id<"practices">[];
};

function groupPracticesByMonth(
	practices: Array<{ _id: Id<"practices">; date: number }>,
): MonthGroup[] {
	const map = new Map<string, MonthGroup>();
	for (const p of practices) {
		const d = new Date(p.date);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
		if (!map.has(key)) {
			map.set(key, {
				key,
				label: d.toLocaleDateString("en-US", { month: "short" }),
				practiceIds: [],
			});
		}
		const group = map.get(key);
		if (group) group.practiceIds.push(p._id);
	}
	return [...map.values()];
}

export default function AttendancePage() {
	const toast = useToast();
	const [filter, setFilter] = useState<"ALL" | "ADULT" | "YOUTH">("ALL");
	const [seasonIndex, setSeasonIndex] = useState(0);
	const [syncing, setSyncing] = useState(false);

	const season = SEASONS[seasonIndex];
	const syncAllAttendance = useAction(api.attendance.syncAllAttendance);

	const data = useQuery(api.attendance.getAttendanceOverview, {
		seasonStart: season.start,
		seasonEnd: season.end,
	});

	const loading = data === undefined;
	const practices = data?.practices ?? [];
	const allPlayers = data?.players ?? [];

	const months = groupPracticesByMonth(practices);

	const players = allPlayers.filter((p) => {
		if (filter === "ADULT") return !p.youth;
		if (filter === "YOUTH") return p.youth;
		return true;
	});

	// Attendance count for a player in a month: { attended, total }
	const monthCount = (
		player: (typeof allPlayers)[0],
		month: MonthGroup,
	): { attended: number; total: number } => {
		const total = month.practiceIds.length;
		const attended = month.practiceIds.filter(
			(pid) =>
				player.attendance.find((x) => x.practiceId === pid)?.attended === true,
		).length;
		return { attended, total };
	};

	// Per-month session rate across all players (attended / total possible)
	const monthRates = months.map((month) => {
		let totalAttended = 0;
		const totalPossible = month.practiceIds.length * allPlayers.length;
		for (const player of allPlayers) {
			totalAttended += monthCount(player, month).attended;
		}
		return totalPossible > 0
			? Math.round((totalAttended / totalPossible) * 100)
			: null;
	});

	// Per-player overall attendance rate (out of all sessions in the season)
	const playerRate = (player: (typeof players)[0]) => {
		const total = practices.length;
		if (total === 0) return null;
		const present = player.attendance.filter((a) => a.attended === true).length;
		return Math.round((present / total) * 100);
	};

	const handleResync = async () => {
		setSyncing(true);
		try {
			const result = await syncAllAttendance();
			toast.success(`Synced ${result.synced} records`);
		} catch {
			toast.error("Sync failed");
		} finally {
			setSyncing(false);
		}
	};

	return (
		<div>
			<PageHeader
				eyebrow="Team"
				title="Attendance"
				actions={
					<div className="flex items-center gap-2">
						{SEASONS.length > 1 ? (
							<select
								value={seasonIndex}
								onChange={(e) => setSeasonIndex(Number(e.target.value))}
								className="h-9 border border-[#cbdbcc] bg-white px-2 text-xs text-[#021e00] focus:outline-none focus:border-[#298a29]"
							>
								{SEASONS.map((s, i) => (
									<option key={s.label} value={i}>
										{s.label}
									</option>
								))}
							</select>
						) : (
							<span className="text-xs text-[#8aab8a] font-medium px-1">
								{season.label}
							</span>
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={handleResync}
							loading={syncing}
							className="text-[10px] px-3"
						>
							{!syncing && <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
							Resync
						</Button>
						<SegmentedControl
							options={[
								{ label: "All", value: "ALL" },
								{ label: "Adult", value: "ADULT" },
								{ label: "Youth", value: "YOUTH" },
							]}
							value={filter}
							onChange={(v) => setFilter(v as "ALL" | "ADULT" | "YOUTH")}
						/>
					</div>
				}
			/>

			{loading ? (
				<div className="flex items-center justify-center py-24">
					<div className="h-6 w-6 border-2 border-[#298a29] border-t-transparent rounded-full animate-spin" />
				</div>
			) : months.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-24 text-center">
					<p className="text-[#021e00] text-lg font-medium">No practices yet</p>
					<p className="text-[#8aab8a] text-sm mt-1">
						Attendance will appear here once practices have passed.
					</p>
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full border-collapse">
						<thead>
							<tr className="bg-[#eef4f1] border-b border-[#cbdbcc]">
								<th className="sticky left-0 z-10 bg-[#eef4f1] px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-[#8aab8a] min-w-[160px] border-r border-[#cbdbcc]">
									Player
								</th>
								<th className="px-3 py-3 text-center text-[10px] font-semibold tracking-[0.12em] uppercase text-[#8aab8a] w-16 border-r border-[#cbdbcc]">
									Rate
								</th>
								{months.map((m) => (
									<th
										key={m.key}
										className="px-3 py-3 text-center min-w-[64px]"
									>
										<p className="text-[10px] font-semibold text-[#8aab8a]">
											{m.label}
										</p>
										<p className="text-[9px] text-[#cbdbcc] mt-0.5">
											{m.practiceIds.length}{" "}
											{m.practiceIds.length === 1 ? "session" : "sessions"}
										</p>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{/* Per-month rate row */}
							<tr className="border-b-2 border-[#cbdbcc] bg-white">
								<td className="sticky left-0 z-10 bg-white px-4 py-2 text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] border-r border-[#cbdbcc]">
									Month Rate
								</td>
								<td className="border-r border-[#cbdbcc]" />
								{monthRates.map((rate, i) => (
									<td key={months[i].key} className="px-3 py-2 text-center">
										{rate !== null ? (
											<span
												className={cn(
													"text-xs font-semibold",
													rate >= 70
														? "text-[#298a29]"
														: rate >= 40
															? "text-amber-600"
															: "text-red-500",
												)}
											>
												{rate}%
											</span>
										) : (
											<span className="text-[#cbdbcc] text-xs">—</span>
										)}
									</td>
								))}
							</tr>

							{/* Player rows */}
							{players.map((player, rowIdx) => {
								const rate = playerRate(player);
								return (
									<tr
										key={player._id}
										className={cn(
											"border-b border-[#cbdbcc]",
											rowIdx % 2 === 0 ? "bg-white" : "bg-[#f8fbf8]",
										)}
									>
										<td className="sticky left-0 z-10 px-4 py-3 border-r border-[#cbdbcc] bg-inherit">
											<p className="text-sm font-medium text-[#021e00] truncate max-w-[140px]">
												{player.fullName}
											</p>
										</td>
										<td className="px-3 py-3 text-center border-r border-[#cbdbcc]">
											{rate !== null ? (
												<span
													className={cn(
														"text-xs font-semibold",
														rate >= 70
															? "text-[#298a29]"
															: rate >= 40
																? "text-amber-600"
																: "text-red-500",
													)}
												>
													{rate}%
												</span>
											) : (
												<span className="text-[#cbdbcc] text-xs">—</span>
											)}
										</td>
										{months.map((month) => {
											const { attended, total } = monthCount(player, month);
											return (
												<td key={month.key} className="px-3 py-3 text-center">
													{total > 0 ? (
														<span
															className={cn(
																"text-xs font-semibold",
																attended / total >= 0.7
																	? "text-[#298a29]"
																	: attended / total >= 0.4
																		? "text-amber-600"
																		: "text-red-500",
															)}
														>
															{attended}/{total}
														</span>
													) : (
														<span className="text-[#cbdbcc] text-xs">—</span>
													)}
												</td>
											);
										})}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
