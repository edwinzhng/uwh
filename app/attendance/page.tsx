"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

function formatShortDate(ts: number) {
	return new Date(ts).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

function formatDayOfWeek(ts: number) {
	return new Date(ts).toLocaleDateString("en-US", { weekday: "short" });
}

export default function AttendancePage() {
	const data = useQuery(api.attendance.getAttendanceOverview);
	const [filter, setFilter] = useState<"ALL" | "ADULT" | "YOUTH">("ALL");

	const loading = data === undefined;

	const practices = data?.practices ?? [];
	const allPlayers = data?.players ?? [];

	const players = allPlayers.filter((p) => {
		if (filter === "ADULT") return !p.youth;
		if (filter === "YOUTH") return p.youth;
		return true;
	});

	// Per-practice attendance rate (across all players)
	const practiceRates = practices.map((p) => {
		const present = allPlayers.filter(
			(pl) =>
				pl.attendance.find((a) => a.practiceId === p._id)?.attended === true,
		).length;
		const recorded = allPlayers.filter(
			(pl) =>
				pl.attendance.find((a) => a.practiceId === p._id)?.attended !== null,
		).length;
		return recorded > 0 ? Math.round((present / recorded) * 100) : null;
	});

	// Per-player attendance rate
	const playerRate = (player: (typeof players)[0]) => {
		const recorded = player.attendance.filter((a) => a.attended !== null);
		if (recorded.length === 0) return null;
		const present = recorded.filter((a) => a.attended === true).length;
		return Math.round((present / recorded.length) * 100);
	};

	return (
		<div>
			<PageHeader
				eyebrow="Team"
				title="Attendance"
				actions={
					<SegmentedControl
						options={[
							{ label: "All", value: "ALL" },
							{ label: "Adult", value: "ADULT" },
							{ label: "Youth", value: "YOUTH" },
						]}
						value={filter}
						onChange={(v) => setFilter(v as "ALL" | "ADULT" | "YOUTH")}
					/>
				}
			/>

			{loading ? (
				<div className="flex items-center justify-center py-24">
					<div className="h-6 w-6 border-2 border-[#298a29] border-t-transparent rounded-full animate-spin" />
				</div>
			) : practices.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-24 text-center">
					<p className="text-[#021e00] text-lg font-medium">
						No past practices
					</p>
					<p className="text-[#8aab8a] text-sm mt-1">
						Attendance will appear here once practices have passed.
					</p>
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full border-collapse">
						<thead>
							<tr className="bg-[#eef4f1] border-b border-[#cbdbcc]">
								{/* Player name column */}
								<th className="sticky left-0 z-10 bg-[#eef4f1] px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-[#8aab8a] min-w-[160px] border-r border-[#cbdbcc]">
									Player
								</th>
								{/* Rate column */}
								<th className="px-3 py-3 text-center text-[10px] font-semibold tracking-[0.12em] uppercase text-[#8aab8a] w-16 border-r border-[#cbdbcc]">
									Rate
								</th>
								{/* Practice columns */}
								{practices.map((p) => (
									<th
										key={p._id}
										className="px-2 py-3 text-center min-w-[52px]"
									>
										<p className="text-[10px] font-semibold text-[#8aab8a]">
											{formatDayOfWeek(p.date)}
										</p>
										<p className="text-[9px] text-[#cbdbcc] mt-0.5">
											{formatShortDate(p.date)}
										</p>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{/* Per-practice rate row */}
							<tr className="border-b-2 border-[#cbdbcc] bg-white">
								<td className="sticky left-0 z-10 bg-white px-4 py-2 text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] border-r border-[#cbdbcc]">
									Session Rate
								</td>
								<td className="border-r border-[#cbdbcc]" />
								{practiceRates.map((rate, i) => (
									<td key={practices[i]._id} className="px-2 py-2 text-center">
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
										{practices.map((p) => {
											const att = player.attendance.find(
												(a) => a.practiceId === p._id,
											);
											const attended = att?.attended ?? null;
											return (
												<td key={p._id} className="px-2 py-3 text-center">
													{attended === true ? (
														<span className="inline-block h-5 w-5 bg-[#298a29] text-white text-[10px] font-bold leading-5 text-center mx-auto">
															✓
														</span>
													) : attended === false ? (
														<span className="inline-block h-5 w-5 bg-red-100 text-red-500 text-[10px] font-bold leading-5 text-center mx-auto">
															✗
														</span>
													) : (
														<span className="text-[#cbdbcc] text-sm">—</span>
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
