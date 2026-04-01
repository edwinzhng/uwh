"use client";

import { useQuery } from "convex/react";
import {
	CartesianGrid,
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

interface PlayerTrendModalProps {
	playerId: Id<"players"> | null;
	onClose: () => void;
}

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
	if (unit === fitnessTestUnits.TIME) {
		return timeStringToSeconds(value);
	}
	if (unit === fitnessTestUnits.COUNT) {
		return Number(value);
	}
	if (unit === fitnessTestUnits.PASS_FAIL) {
		return value === "PASS" ? 1 : 0;
	}
	return null;
};

const formatYAxisTick = (value: number, unit: string): string => {
	if (unit === fitnessTestUnits.TIME) return secondsToTimeString(value);
	if (unit === fitnessTestUnits.PASS_FAIL) return value === 1 ? "Pass" : "Fail";
	return `${value}`;
};

const formatTooltipValue = (value: number, unit: string): string => {
	if (unit === fitnessTestUnits.TIME) return secondsToTimeString(value);
	if (unit === fitnessTestUnits.PASS_FAIL) return value === 1 ? "Pass" : "Fail";
	return `${value}`;
};

const renderTooltip = (unit: string) =>
	function TooltipContent({
		active,
		payload,
		label,
	}: {
		active?: boolean;
		payload?: ReadonlyArray<{ value?: number | string | null }>;
		label?: string;
	}) {
		if (!active || !payload || payload.length === 0) return null;
		const raw = payload[0]?.value;
		if (raw == null) return null;
		return (
			<div className="border border-[#cbdbcc] bg-white px-3 py-2 shadow-sm text-xs">
				<p className="text-[#6c866d] mb-1">{label}</p>
				<p className="font-semibold text-[#021e00]">
					{formatTooltipValue(Number(raw), unit)}
				</p>
			</div>
		);
	};

interface TestChartProps {
	testId: string;
	testName: string;
	unit: string;
	results: Array<{ testId: string; value: string; date: number }>;
}

const TestChart = ({ testId, testName, unit, results }: TestChartProps) => {
	const testResults = results.filter((r) => r.testId === testId);

	if (testResults.length === 0) {
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

	const chartData = testResults.map((r) => ({
		date: formatDate(r.date),
		value: valueToNumeric(r.value, unit) ?? 0,
	}));

	const yDomain = (() => {
		if (unit === fitnessTestUnits.PASS_FAIL) return [0, 1] as [number, number];
		const values = chartData.map((d) => d.value);
		const min = Math.min(...values);
		const max = Math.max(...values);
		const padding = (max - min) * 0.15 || 1;
		return [Math.max(0, min - padding), max + padding] as [number, number];
	})();

	const yTicks = unit === fitnessTestUnits.PASS_FAIL ? [0, 1] : undefined;

	return (
		<div className="mb-6">
			<p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8aab8a] mb-3">
				{testName}
			</p>
			<div className="bg-white border border-[#cbdbcc] p-3">
				<ResponsiveContainer width="100%" height={160}>
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
						{/* biome-ignore lint/suspicious/noExplicitAny: Recharts v3 tooltip type is overly strict */}
						<Tooltip content={renderTooltip(unit) as any} />
						<Line
							type="monotone"
							dataKey="value"
							stroke="#298a29"
							strokeWidth={2}
							dot={{ fill: "#298a29", r: 3, strokeWidth: 0 }}
							activeDot={{ fill: "#021e00", r: 4, strokeWidth: 0 }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};

export function PlayerTrendModal({ playerId, onClose }: PlayerTrendModalProps) {
	const history = useQuery(
		api.fitnessTests.getPlayerFitnessHistory,
		playerId ? { playerId } : "skip",
	);

	const isOpen = playerId !== null;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent
				title={history?.player.fullName ?? "Player Trends"}
				subtitle="Fitness History"
				className="sm:max-w-2xl"
			>
				<div className="p-6">
					{history === undefined ? (
						<div className="flex h-[200px] items-center justify-center">
							<div className="h-6 w-6 animate-spin rounded-full border-2 border-[#298a29] border-t-transparent" />
						</div>
					) : history === null ? (
						<p className="text-sm text-[#6c866d]">Player not found.</p>
					) : history.tests.length === 0 ? (
						<p className="text-sm text-[#6c866d]">
							No fitness test data recorded for this player.
						</p>
					) : (
						history.tests.map((test) => (
							<TestChart
								key={test._id}
								testId={test._id}
								testName={test.name}
								unit={test.unit}
								results={history.results}
							/>
						))
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
