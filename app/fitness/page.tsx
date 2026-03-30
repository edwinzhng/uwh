"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { BarChart2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { api } from "@/convex/_generated/api";
import { fitnessTestUnits } from "@/lib/fitness";
import { cn } from "@/lib/utils";

type OverviewQuery = FunctionReturnType<
	typeof api.fitnessTests.getFitnessOverview
>;
type TestStat = NonNullable<OverviewQuery>[number];
type PlayerStat = TestStat["playerStats"][number];

type PlayerFilter = "ALL" | "ADULT" | "YOUTH";

const PassFailBadge = ({ value }: { value: string }) => (
	<span
		className={cn(
			"inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] uppercase",
			value === "PASS"
				? "bg-[#d4f0d4] text-[#1a6b1a]"
				: "bg-[#fde8e8] text-[#9b1c1c]",
		)}
	>
		{value}
	</span>
);

const RankBadge = ({ rank }: { rank: number }) => (
	<span className="text-[10px] font-semibold text-[#8aab8a]">{rank}</span>
);

const ExerciseTable = ({
	testStat,
	playerFilter,
}: {
	testStat: TestStat;
	playerFilter: PlayerFilter;
}) => {
	const { test, playerStats } = testStat;
	const isPassFail = test.unit === fitnessTestUnits.PASS_FAIL;
	const isTime = test.unit === fitnessTestUnits.TIME;

	const playersQuery = useQuery(api.players.getPlayers) ?? [];
	const playerTypeById = new Map(playersQuery.map((p) => [p._id, p.youth]));

	const filtered = playerStats.filter((s) => {
		const isYouth = playerTypeById.get(s.playerId);
		if (playerFilter === "ADULT") return !isYouth;
		if (playerFilter === "YOUTH") return isYouth;
		return true;
	});

	if (filtered.length === 0) {
		return (
			<div className="border border-[#cbdbcc] bg-white px-6 py-8 text-center">
				<p className="text-sm text-[#6c866d]">No results recorded yet</p>
			</div>
		);
	}

	const passFailMeta = isPassFail
		? (() => {
				const totalResults = filtered.reduce(
					(sum, s) => sum + s.resultCount,
					0,
				);
				const passCount = filtered.filter((s) => s.best === "PASS").length;
				return { passCount, totalPlayers: filtered.length, totalResults };
			})()
		: undefined;

	const allBestNums = isPassFail
		? []
		: filtered.map((s) =>
				isTime
					? (() => {
							const [m = "0", sec = "0"] = s.best.split(":");
							return Number(m) * 60 + Number(sec);
						})()
					: Number(s.best),
			);

	const overallBest =
		allBestNums.length > 0
			? isTime
				? Math.min(...allBestNums)
				: Math.max(...allBestNums)
			: undefined;

	const overallAvgNums = isPassFail
		? []
		: filtered.map((s) =>
				isTime
					? (() => {
							const [m = "0", sec = "0"] = s.average.split(":");
							return Number(m) * 60 + Number(sec);
						})()
					: Number(s.average),
			);
	const overallAvg =
		overallAvgNums.length > 0
			? overallAvgNums.reduce((sum, v) => sum + v, 0) / overallAvgNums.length
			: undefined;

	const formatAvg = (val: number) => {
		if (!isTime) return Number.isInteger(val) ? `${val}` : val.toFixed(1);
		const secs = Math.round(val);
		const m = Math.floor(secs / 60);
		const s = `${secs % 60}`.padStart(2, "0");
		return `${m}:${s}`;
	};

	return (
		<div className="border border-[#cbdbcc] bg-white">
			{/* Summary strip */}
			<div className="grid grid-cols-3 border-b border-[#cbdbcc] divide-x divide-[#cbdbcc] bg-[#f5faf5]">
				<div className="px-4 py-3">
					<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8aab8a]">
						Players
					</p>
					<p className="mt-0.5 text-lg font-bold text-[#021e00]">
						{filtered.length}
					</p>
				</div>
				{isPassFail && passFailMeta ? (
					<>
						<div className="px-4 py-3">
							<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8aab8a]">
								Passed
							</p>
							<p className="mt-0.5 text-lg font-bold text-[#021e00]">
								{passFailMeta.passCount}
								<span className="text-sm font-normal text-[#8aab8a]">
									/{passFailMeta.totalPlayers}
								</span>
							</p>
						</div>
						<div className="px-4 py-3">
							<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8aab8a]">
								Pass Rate
							</p>
							<p className="mt-0.5 text-lg font-bold text-[#021e00]">
								{Math.round(
									(passFailMeta.passCount / passFailMeta.totalPlayers) * 100,
								)}
								%
							</p>
						</div>
					</>
				) : (
					<>
						<div className="px-4 py-3">
							<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8aab8a]">
								Best
							</p>
							<p className="mt-0.5 text-lg font-bold text-[#021e00]">
								{overallBest !== undefined ? formatAvg(overallBest) : "—"}
							</p>
						</div>
						<div className="px-4 py-3">
							<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8aab8a]">
								Team Average
							</p>
							<p className="mt-0.5 text-lg font-bold text-[#021e00]">
								{overallAvg !== undefined ? formatAvg(overallAvg) : "—"}
							</p>
						</div>
					</>
				)}
			</div>

			{/* Column headers */}
			<div
				className={cn(
					"grid gap-2 border-b border-[#cbdbcc] bg-[#eef4f1] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8aab8a]",
					isPassFail
						? "grid-cols-[24px_1fr_80px_80px]"
						: "grid-cols-[24px_1fr_80px_80px_60px]",
				)}
			>
				<span>#</span>
				<span>Player</span>
				<span>Best</span>
				<span>Average</span>
				{!isPassFail && <span className="text-right">Results</span>}
			</div>

			{/* Rows */}
			{filtered.map((stat, index) => (
				<PlayerStatRow
					key={stat.playerId}
					stat={stat}
					rank={index + 1}
					isPassFail={isPassFail}
				/>
			))}
		</div>
	);
};

const PlayerStatRow = ({
	stat,
	rank,
	isPassFail,
}: {
	stat: PlayerStat;
	rank: number;
	isPassFail: boolean;
}) => (
	<div
		className={cn(
			"grid items-center gap-2 border-b border-[#cbdbcc] px-4 py-3 last:border-b-0 hover:bg-[#f9fcf9]",
			isPassFail
				? "grid-cols-[24px_1fr_80px_80px]"
				: "grid-cols-[24px_1fr_80px_80px_60px]",
		)}
	>
		<RankBadge rank={rank} />
		<span className="min-w-0 truncate text-sm font-medium text-[#021e00]">
			{stat.playerName}
		</span>
		<span className="text-sm font-semibold text-[#021e00]">
			{isPassFail ? <PassFailBadge value={stat.best} /> : stat.best}
		</span>
		<span className="text-sm text-[#4a8a40]">{stat.average}</span>
		{!isPassFail && (
			<span className="text-right text-xs text-[#8aab8a]">
				{stat.resultCount}
			</span>
		)}
	</div>
);

export default function FitnessOverviewPage(): React.JSX.Element {
	const overviewData = useQuery(api.fitnessTests.getFitnessOverview);
	const loading = overviewData === undefined;
	const tests = overviewData ?? [];
	const [playerFilter, setPlayerFilter] = useState<PlayerFilter>("ALL");
	const [activeTabId, setActiveTabId] = useState<string | undefined>(undefined);

	const activeTab =
		tests.find((t) => t.test._id === activeTabId) ?? tests.at(0);

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
				<div>
					{/* Tab strip */}
					<div className="flex overflow-x-auto border-b border-[#cbdbcc] px-6">
						{tests.map((testStat) => {
							const isActive = testStat.test._id === activeTab?.test._id;
							const hasData = testStat.playerStats.length > 0;
							return (
								<button
									key={testStat.test._id}
									type="button"
									onClick={() => setActiveTabId(testStat.test._id)}
									className={cn(
										"relative shrink-0 whitespace-nowrap pb-3 pr-6 pt-4 text-left transition-colors",
										isActive
											? "text-[#021e00]"
											: hasData
												? "text-[#6c866d] hover:text-[#021e00]"
												: "text-[#aec7ae] hover:text-[#8aab8a]",
									)}
								>
									<span className="text-sm font-semibold">
										{testStat.test.name}
									</span>
									{isActive && (
										<span className="absolute bottom-0 left-0 right-6 h-0.5 bg-[#021e00]" />
									)}
								</button>
							);
						})}
					</div>

					{/* Active tab content */}
					<div className="px-6 py-6">
						{activeTab ? (
							activeTab.playerStats.length > 0 ? (
								<ExerciseTable
									testStat={activeTab}
									playerFilter={playerFilter}
								/>
							) : (
								<div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
									<p className="text-lg font-medium text-[#021e00]">
										No results recorded
									</p>
									<p className="mt-1 text-sm text-[#6c866d]">
										Record a session for{" "}
										<span className="font-medium">{activeTab.test.name}</span>{" "}
										to see stats here.
									</p>
								</div>
							)
						) : null}
					</div>
				</div>
			)}
		</div>
	);
}
