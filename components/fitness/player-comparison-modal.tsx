"use client";

import { useQuery } from "convex/react";
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
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { fitnessTestUnits } from "@/lib/fitness";

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

const formatDate = (timestamp: number): string => {
	const d = new Date(timestamp);
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "2-digit",
	});
};

const timeStringToSeconds = (value: string): number => {
	const [minutes = "0", seconds = "0"] = value.split(":");
	return Number(minutes) * 60 + Number(seconds);
};

const secondsToTimeString = (seconds: number): string => {
	const m = Math.floor(seconds / 60);
	const s = `${Math.round(seconds % 60)}`.padStart(2, "0");
	return `${m}:${s}`;
};

const valueToNumeric = (value: string, unit: string): number | null => {
	if (unit === fitnessTestUnits.TIME) return timeStringToSeconds(value);
	if (unit === fitnessTestUnits.COUNT) return Number(value);
	if (unit === fitnessTestUnits.PASS_FAIL) return value === "PASS" ? 1 : 0;
	return null;
};

const formatYAxisTick = (value: number, unit: string): string => {
	if (unit === fitnessTestUnits.TIME) return secondsToTimeString(value);
	if (unit === fitnessTestUnits.PASS_FAIL) return value === 1 ? "Pass" : "Fail";
	return `${value}`;
};

type PlayerHistory = NonNullable<
	ReturnType<
		typeof useQuery<typeof api.fitnessTests.getMultiplePlayerFitnessHistories>
	>
>[number];

interface ComparisonChartProps {
	testId: string;
	testName: string;
	unit: string;
	playerHistories: PlayerHistory[];
}

const ComparisonChart = ({
	testId,
	testName,
	unit,
	playerHistories,
}: ComparisonChartProps) => {
	// Collect all unique dates across all players for this test
	const allDates = [
		...new Set(
			playerHistories.flatMap((h) =>
				h.results.filter((r) => r.testId === testId).map((r) => r.date),
			),
		),
	].sort((a, b) => a - b);

	const hasAnyData = allDates.length > 0;

	if (!hasAnyData) {
		return (
			<div className="mb-6">
				<p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8aab8a] mb-3">
					{testName}
				</p>
				<div className="flex h-[140px] items-center justify-center border border-[#cbdbcc] bg-white">
					<p className="text-xs text-[#cbdbcc]">No data recorded</p>
				</div>
			</div>
		);
	}

	// Build chart data: one row per date, one key per player
	const chartData = allDates.map((date) => {
		const row: Record<string, string | number | null> = {
			date: formatDate(date),
		};
		for (const h of playerHistories) {
			const result = h.results.find(
				(r) => r.testId === testId && r.date === date,
			);
			row[h.player.fullName] =
				result != null ? (valueToNumeric(result.value, unit) ?? null) : null;
		}
		return row;
	});

	const allValues = playerHistories.flatMap((h) =>
		h.results
			.filter((r) => r.testId === testId)
			.map((r) => valueToNumeric(r.value, unit))
			.filter((v): v is number => v !== null),
	);

	const yDomain = (() => {
		if (unit === fitnessTestUnits.PASS_FAIL) return [0, 1] as [number, number];
		if (allValues.length === 0) return [0, 1] as [number, number];
		const min = Math.min(...allValues);
		const max = Math.max(...allValues);
		const padding = (max - min) * 0.15 || 1;
		return [Math.max(0, min - padding), max + padding] as [number, number];
	})();

	const yTicks = unit === fitnessTestUnits.PASS_FAIL ? [0, 1] : undefined;

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
					const formatted =
						unit === fitnessTestUnits.TIME
							? secondsToTimeString(entry.value)
							: unit === fitnessTestUnits.PASS_FAIL
								? entry.value === 1
									? "Pass"
									: "Fail"
								: `${entry.value}`;
					return (
						<p
							key={entry.name}
							className="font-semibold"
							style={{ color: entry.color }}
						>
							{entry.name}: {formatted}
						</p>
					);
				})}
			</div>
		);
	}
	// biome-ignore lint/suspicious/noExplicitAny: Recharts v3 tooltip content type is overly strict
	const tooltipContent = renderTooltip as any;

	return (
		<div className="mb-6">
			<p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8aab8a] mb-3">
				{testName}
			</p>
			<div className="bg-white border border-[#cbdbcc] p-3">
				<ResponsiveContainer width="100%" height={180}>
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
							dataKey="date"
							tick={{ fontSize: 10, fill: "#8aab8a" }}
							axisLine={false}
							tickLine={false}
							dy={6}
						/>
						<YAxis
							domain={yDomain}
							ticks={yTicks}
							tickFormatter={(v) => formatYAxisTick(v, unit)}
							tick={{ fontSize: 10, fill: "#8aab8a" }}
							axisLine={false}
							tickLine={false}
							width={unit === fitnessTestUnits.TIME ? 42 : 30}
						/>
						<Tooltip content={tooltipContent} />
						<Legend
							wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
							formatter={(value) => (
								<span style={{ color: "#021e00" }}>{value}</span>
							)}
						/>
						{playerHistories.map((h, i) => (
							<Line
								key={h.player._id}
								type="monotone"
								dataKey={h.player.fullName}
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
		</div>
	);
};

interface PlayerComparisonModalProps {
	playerIds: Id<"players">[];
	onClose: () => void;
}

export function PlayerComparisonModal({
	playerIds,
	onClose,
}: PlayerComparisonModalProps) {
	const histories = useQuery(
		api.fitnessTests.getMultiplePlayerFitnessHistories,
		playerIds.length > 0 ? { playerIds } : "skip",
	);

	const isOpen = playerIds.length > 0;

	// Union of all tests across all players
	const allTests = (() => {
		if (!histories) return [];
		const testMap = new Map<
			string,
			{ _id: string; name: string; unit: string }
		>();
		for (const h of histories) {
			for (const t of h.tests) {
				if (!testMap.has(t._id)) testMap.set(t._id, t);
			}
		}
		return [...testMap.values()].sort((a, b) => a.name.localeCompare(b.name));
	})();

	const title = (() => {
		if (!histories || histories.length === 0) return "Compare Players";
		if (histories.length === 2)
			return histories.map((h) => h.player.fullName).join(" vs ");
		return `Comparing ${histories.length} players`;
	})();

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent
				title={title}
				subtitle="Fitness Comparison"
				className="sm:max-w-3xl"
			>
				<div className="p-6">
					{histories === undefined ? (
						<div className="flex h-[200px] items-center justify-center">
							<div className="h-6 w-6 animate-spin rounded-full border-2 border-[#298a29] border-t-transparent" />
						</div>
					) : histories.length === 0 ? (
						<p className="text-sm text-[#6c866d]">No players found.</p>
					) : allTests.length === 0 ? (
						<p className="text-sm text-[#6c866d]">
							No fitness test data recorded for these players.
						</p>
					) : (
						allTests.map((test) => (
							<ComparisonChart
								key={test._id}
								testId={test._id}
								testName={test.name}
								unit={test.unit}
								playerHistories={histories}
							/>
						))
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
