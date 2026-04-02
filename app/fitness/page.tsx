"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
	BarChart2,
	ChevronDown,
	ChevronUp,
	Star,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PlayerComparisonModal } from "@/components/fitness/player-comparison-modal";
import { PlayerTrendModal } from "@/components/fitness/player-trend-modal";
import { PageHeader } from "@/components/layout/page-header";
import { Checkbox } from "@/components/ui/checkbox";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type OverviewQuery = FunctionReturnType<
	typeof api.fitnessTests.getFitnessOverview
>;

type PlayerFilter = "ALL" | "ADULT" | "YOUTH";
type SortDir = "none" | "desc" | "asc";

type PivotedPlayer = {
	playerId: Id<"players">;
	playerName: string;
	isYouth: boolean | undefined;
	results: Map<string, { best: string; average: string }>;
};

const pivotData = (tests: NonNullable<OverviewQuery>): PivotedPlayer[] => {
	const playerMap = new Map<string, PivotedPlayer>();

	for (const testStat of tests) {
		for (const stat of testStat.playerStats) {
			if (!playerMap.has(stat.playerId)) {
				playerMap.set(stat.playerId, {
					playerId: stat.playerId,
					playerName: stat.playerName,
					isYouth: undefined,
					results: new Map(),
				});
			}
			playerMap.get(stat.playerId)?.results.set(testStat.test._id, {
				best: stat.best,
				average: stat.average,
			});
		}
	}

	return [...playerMap.values()].sort((a, b) =>
		a.playerName.localeCompare(b.playerName),
	);
};

const formatSessionDate = (timestamp: number): string => {
	const d = new Date(timestamp);
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
};

const getTimeValueInSeconds = (value: string): number => {
	const [minutes = "0", seconds = "0"] = value.split(":");
	return Number(minutes) * 60 + Number(seconds);
};

const compareValues = (
	unit: string,
	a: string | undefined,
	b: string | undefined,
	dir: SortDir,
): number => {
	// Players without results go to the bottom regardless of sort direction
	if (!a && !b) return 0;
	if (!a) return 1;
	if (!b) return -1;

	let cmp = 0;
	if (unit === "TIME") {
		// lower is better for TIME
		cmp = getTimeValueInSeconds(a) - getTimeValueInSeconds(b);
		// desc = best first = ascending seconds
	} else if (unit === "COUNT") {
		// higher is better for COUNT
		cmp = Number(b) - Number(a);
		// desc = best first = descending count
	} else {
		// PASS_FAIL: PASS > FAIL
		const aScore = a === "PASS" ? 1 : 0;
		const bScore = b === "PASS" ? 1 : 0;
		cmp = bScore - aScore;
	}

	return dir === "asc" ? -cmp : cmp;
};

const OverviewTable = ({
	tests,
	playerFilter,
	playersQuery,
	isSessionFiltered,
	onPlayerClick,
	selectedPlayerIds,
	onTogglePlayer,
}: {
	tests: NonNullable<OverviewQuery>;
	playerFilter: PlayerFilter;
	playersQuery: { _id: string; youth: boolean | undefined }[];
	isSessionFiltered: boolean;
	onPlayerClick: (playerId: Id<"players">) => void;
	selectedPlayerIds: Set<Id<"players">>;
	onTogglePlayer: (playerId: Id<"players">) => void;
}) => {
	const [sortState, setSortState] = useState<{
		testId: string | null;
		dir: SortDir;
	}>({ testId: null, dir: "none" });

	const playerYouthById = new Map(playersQuery.map((p) => [p._id, p.youth]));
	const allPlayers = pivotData(tests).map((p) => ({
		...p,
		isYouth: playerYouthById.get(p.playerId),
	}));

	const filteredPlayers = allPlayers.filter((p) => {
		if (playerFilter === "ADULT") return !p.isYouth;
		if (playerFilter === "YOUTH") return p.isYouth;
		return true;
	});

	const handleColumnSort = (testId: string) => {
		setSortState((prev) => {
			if (prev.testId !== testId) return { testId, dir: "desc" };
			if (prev.dir === "none") return { testId, dir: "desc" };
			if (prev.dir === "desc") return { testId, dir: "asc" };
			return { testId: null, dir: "none" };
		});
	};

	const players = (() => {
		if (!sortState.testId || sortState.dir === "none") return filteredPlayers;
		const sortTest = tests.find((t) => t.test._id === sortState.testId);
		if (!sortTest) return filteredPlayers;
		return [...filteredPlayers].sort((a, b) => {
			const aVal = a.results.get(sortTest.test._id)?.best;
			const bVal = b.results.get(sortTest.test._id)?.best;
			return compareValues(sortTest.test.unit, aVal, bVal, sortState.dir);
		});
	})();

	if (players.length === 0) {
		return (
			<div className="flex min-h-[30vh] items-center justify-center text-center">
				<p className="text-sm text-[#6c866d]">No players match this filter.</p>
			</div>
		);
	}

	// All players tied for the best result per test (only relevant in all-time view)
	const recordHolders = new Map<string, Set<string>>(
		tests.map((t) => {
			const topValue = t.playerStats.at(0)?.best;
			const holders = new Set(
				topValue !== undefined
					? t.playerStats
							.filter((s) => s.best === topValue)
							.map((s) => s.playerId)
					: [],
			);
			return [t.test._id, holders];
		}),
	);

	return (
		<div className="overflow-x-auto">
			<table className="w-full border-collapse text-sm">
				<thead>
					<tr className="border-b border-[#cbdbcc] bg-[#eef4f1]">
						<th className="sticky left-0 z-10 w-10 bg-[#eef4f1] px-3 py-3" />
						<th className="sticky left-10 z-10 min-w-[140px] bg-[#eef4f1] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8aab8a]">
							Player
						</th>
						{tests.map((t) => {
							const isSorted =
								sortState.testId === t.test._id && sortState.dir !== "none";
							return (
								<th
									key={t.test._id}
									className="min-w-[110px] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8aab8a] cursor-pointer select-none hover:text-[#021e00]"
									onClick={() => handleColumnSort(t.test._id)}
								>
									<span className="flex items-center gap-1">
										{t.test.name}
										{isSorted ? (
											sortState.dir === "desc" ? (
												<ChevronDown className="h-3 w-3 flex-shrink-0" />
											) : (
												<ChevronUp className="h-3 w-3 flex-shrink-0" />
											)
										) : null}
									</span>
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{players.map((player, i) => {
						const isSelected = selectedPlayerIds.has(player.playerId);
						const rowBg = i % 2 === 0 ? "bg-white" : "bg-[#fafcfa]";
						return (
							<tr
								key={player.playerId}
								className={cn(
									"border-b border-[#cbdbcc] transition-colors",
									isSelected
										? "bg-[#e8f5e8]"
										: i % 2 === 0
											? "bg-white hover:bg-[#f0f7f0]"
											: "bg-[#fafcfa] hover:bg-[#eaf3ea]",
								)}
							>
								<td
									className={cn(
										"sticky left-0 z-10 w-10 px-3 py-3",
										isSelected ? "bg-[#e8f5e8]" : rowBg,
									)}
								>
									<Checkbox
										checked={isSelected}
										onChange={() => onTogglePlayer(player.playerId)}
									/>
								</td>
								<td
									className={cn(
										"sticky left-10 z-10 min-w-[140px] px-4 py-3 font-medium text-[#021e00]",
										isSelected ? "bg-[#e8f5e8]" : rowBg,
									)}
								>
									<button
										type="button"
										className="text-left w-full hover:underline focus-visible:outline-none focus-visible:underline"
										onClick={() => onPlayerClick(player.playerId)}
									>
										{player.playerName}
									</button>
								</td>
								{tests.map((t) => {
									const result = player.results.get(t.test._id);
									const isRecord =
										!isSessionFiltered &&
										(recordHolders.get(t.test._id)?.has(player.playerId) ??
											false);
									return (
										<td key={t.test._id} className="min-w-[110px] px-4 py-3">
											{result ? (
												<div className="flex flex-col gap-0.5">
													<span className="flex items-center gap-1 font-semibold text-[#021e00]">
														{result.best}
														{isRecord && (
															<Star className="h-3 w-3 fill-amber-400 text-amber-400" />
														)}
													</span>
													{result.average && (
														<span className="text-xs text-[#8aab8a]">
															{result.average}
														</span>
													)}
												</div>
											) : (
												<span className="text-[#cbdbcc]">—</span>
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
	);
};

export default function FitnessOverviewPage(): React.JSX.Element {
	const [playerFilter, setPlayerFilter] = useState<PlayerFilter>("ALL");
	const [selectedDate, setSelectedDate] = useState<number | undefined>(
		undefined,
	);
	const [trendPlayerId, setTrendPlayerId] = useState<Id<"players"> | null>(
		null,
	);
	const [selectedPlayerIds, setSelectedPlayerIds] = useState<
		Set<Id<"players">>
	>(new Set());
	const [comparingPlayerIds, setComparingPlayerIds] = useState<Id<"players">[]>(
		[],
	);

	const togglePlayer = (id: Id<"players">) => {
		setSelectedPlayerIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const sessionDates =
		useQuery(api.fitnessTests.getFitnessTestSessionDates) ?? [];
	const overviewData = useQuery(api.fitnessTests.getFitnessOverview, {
		sessionDate: selectedDate,
	});
	const playersQuery = useQuery(api.players.getPlayers) ?? [];

	const loading = overviewData === undefined;
	const tests = overviewData ?? [];

	return (
		<div>
			<PageHeader
				eyebrow="Performance"
				title="Fitness Overview"
				subtitle={
					loading
						? "Loading..."
						: `${tests.length} exercise${tests.length === 1 ? "" : "s"}`
				}
				actions={
					<div className="flex items-center gap-3">
						{sessionDates.length > 0 && (
							<select
								className="h-[34px] border border-[#cbdbcc] bg-white px-3 text-xs font-medium text-[#021e00] hover:border-[#021e00] focus:outline-none focus:border-[#021e00] cursor-pointer"
								value={selectedDate ?? ""}
								onChange={(e) => {
									const val = e.target.value;
									setSelectedDate(val === "" ? undefined : Number(val));
								}}
							>
								<option value="">All Time</option>
								{sessionDates.map((date) => (
									<option key={date} value={date}>
										{formatSessionDate(date)}
									</option>
								))}
							</select>
						)}
						<SegmentedControl
							options={[
								{ label: "All", value: "ALL" },
								{ label: "Adult", value: "ADULT" },
								{ label: "Youth", value: "YOUTH" },
							]}
							value={playerFilter}
							onChange={(v) => setPlayerFilter(v as PlayerFilter)}
							size="sm"
						/>
						<Link
							href="/fitness/sessions"
							className="flex h-[34px] items-center gap-1.5 border border-[#cbdbcc] px-3 text-xs font-semibold tracking-[0.08em] uppercase text-[#021e00] hover:border-[#021e00] hover:bg-white"
						>
							<BarChart2 className="h-3.5 w-3.5" />
							Sessions
						</Link>
					</div>
				}
			/>

			{loading ? (
				<div className="flex min-h-[50vh] items-center justify-center">
					<div className="h-6 w-6 animate-spin rounded-full border-2 border-[#298a29] border-t-transparent" />
				</div>
			) : tests.length === 0 ? (
				<div className="flex min-h-[50vh] flex-col items-center justify-center px-8 text-center">
					<TrendingUp className="h-12 w-12 text-[#cbdbcc]" />
					<p className="mt-4 text-xl font-medium text-[#021e00]">
						No fitness tests yet
					</p>
					<p className="mt-2 text-sm text-[#6c866d]">
						Create tests and record sessions to see the overview here.
					</p>
					<Link
						href="/fitness/sessions"
						className="mt-5 inline-flex h-9 items-center gap-2 bg-[#021e00] px-5 text-sm font-medium text-[#eef4f1] hover:bg-[#0a3000]"
					>
						Go to Fitness Tests
					</Link>
				</div>
			) : (
				<div className="py-6">
					<OverviewTable
						tests={tests}
						playerFilter={playerFilter}
						playersQuery={playersQuery}
						isSessionFiltered={selectedDate !== undefined}
						onPlayerClick={(id) => setTrendPlayerId(id)}
						selectedPlayerIds={selectedPlayerIds}
						onTogglePlayer={togglePlayer}
					/>
				</div>
			)}

			{selectedPlayerIds.size >= 2 && (
				<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#021e00] px-5 py-3 shadow-lg">
					<span className="text-xs text-[#8aab8a]">
						{selectedPlayerIds.size} players selected
					</span>
					<button
						type="button"
						onClick={() => {
							setComparingPlayerIds([...selectedPlayerIds]);
						}}
						className="text-xs font-semibold text-[#eef4f1] hover:text-white underline underline-offset-2"
					>
						Compare
					</button>
					<button
						type="button"
						onClick={() => setSelectedPlayerIds(new Set())}
						className="text-xs text-[#6c866d] hover:text-[#8aab8a]"
					>
						Clear
					</button>
				</div>
			)}

			<PlayerTrendModal
				playerId={trendPlayerId}
				onClose={() => setTrendPlayerId(null)}
			/>
			<PlayerComparisonModal
				playerIds={comparingPlayerIds}
				onClose={() => setComparingPlayerIds([])}
			/>
		</div>
	);
}
