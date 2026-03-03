"use client";

import { useAtom } from "jotai";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AddEditCoachModal } from "@/components/coaches/add-edit-coach-modal";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	apiClient,
	type Coach,
	type CoachStatistics,
	type Practice,
} from "@/lib/api";
import { selectedCoachIdAtom } from "@/lib/atoms";
import { cn, formatMonthDay, getPracticeTitle } from "@/lib/utils";

function generateSeasons() {
	const currentYear = new Date().getFullYear();
	const currentMonth = new Date().getMonth(); // 0 is jan
	// If it's before September (8), the current season started last year.
	const seasonStartYear = currentMonth < 8 ? currentYear - 1 : currentYear;

	return [
		{
			label: `${seasonStartYear + 1}–${seasonStartYear + 2} Season`,
			value: `${seasonStartYear + 1}-${seasonStartYear + 2}`,
			start: `${seasonStartYear + 1}-09-01`,
			end: `${seasonStartYear + 2}-08-31`,
		},
		{
			label: `${seasonStartYear}–${seasonStartYear + 1} Season`,
			value: `${seasonStartYear}-${seasonStartYear + 1}`,
			start: `${seasonStartYear}-09-01`,
			end: `${seasonStartYear + 1}-08-31`,
		},
		{
			label: `${seasonStartYear - 1}–${seasonStartYear} Season`,
			value: `${seasonStartYear - 1}-${seasonStartYear}`,
			start: `${seasonStartYear - 1}-09-01`,
			end: `${seasonStartYear}-08-31`,
		},
	];
}

const SEASONS = generateSeasons();

export default function CoachesPage() {
	const [coaches, setCoaches] = useState<Coach[]>([]);
	const [stats, setStats] = useState<CoachStatistics[]>([]);
	const [practices, setPractices] = useState<Practice[]>([]);
	const [selectedCoachId, setSelectedCoachId] = useAtom(selectedCoachIdAtom);
	// Select the current season (index 1) which is exactly what generateSeasons index 1 is.
	const [season, setSeason] = useState(SEASONS[1]);
	const [loading, setLoading] = useState(true);
	const [showSeasonPicker, setShowSeasonPicker] = useState(false);
	const [showAddModal, setShowAddModal] = useState(false);
	const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
	const [showAllPractices, setShowAllPractices] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: ignore
	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const [coachList, statList, practiceList] = await Promise.all([
				apiClient.getCoaches(),
				apiClient.getCoachStatistics(season.start, season.end),
				apiClient.getPastPractices(),
			]);
			const sorted = coachList
				.filter((c) => c.isActive)
				.sort((a, b) => {
					const aHrs =
						statList.find((s) => s.coachId === a.id)?.totalHours ?? 0;
					const bHrs =
						statList.find((s) => s.coachId === b.id)?.totalHours ?? 0;
					return bHrs - aHrs;
				});
			setCoaches(sorted);
			setStats(statList);
			setPractices(practiceList);
			if (!selectedCoachId && sorted.length > 0) {
				setSelectedCoachId(sorted[0].id);
			}
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [season]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Reset toggle when coach changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: ignore
	useEffect(() => {
		setShowAllPractices(false);
	}, [selectedCoachId]);

	const selectedCoach = coaches.find((c) => c.id === selectedCoachId);
	const selectedStat = stats.find((s) => s.coachId === selectedCoachId);

	// Practices coached by selected coach
	const coachPractices = practices
		.filter((p) =>
			p.practiceCoaches.some((pc) => pc.coachId === selectedCoachId),
		)
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	const displayedPractices = showAllPractices
		? coachPractices
		: coachPractices.slice(0, 5);
	const morePractices = showAllPractices
		? 0
		: coachPractices.length - displayedPractices.length;

	return (
		<div>
			<PageHeader
				eyebrow="Staff"
				title="Coaches"
				actions={
					<div className="flex items-center gap-2">
						<div className="relative">
							<button
								type="button"
								onClick={() => setShowSeasonPicker((v) => !v)}
								className="h-9 px-3 border border-[#cbdbcc] text-[#021e00] text-xs font-medium hover:border-[#021e00]  flex items-center gap-1"
							>
								{season.label} ▾
							</button>
							{showSeasonPicker && (
								<div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[#cbdbcc] shadow-lg min-w-[180px]">
									{SEASONS.map((s) => (
										<button
											key={s.value}
											type="button"
											onClick={() => {
												setSeason(s);
												setShowSeasonPicker(false);
											}}
											className={cn(
												"block w-full text-left px-4 py-2.5 text-sm hover:bg-[#eef4f1] ",
												s.value === season.value
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
						<Button
							className="h-9 px-4"
							onClick={() => {
								setEditingCoach(null);
								setShowAddModal(true);
							}}
						>
							<Plus className="h-4 w-4 mr-1.5" />
							Add Coach
						</Button>
					</div>
				}
			/>

			{loading ? (
				<div className="flex items-center justify-center py-24">
					<div className="h-6 w-6 border-2 border-[#298a29] border-t-transparent rounded-full animate-spin" />
				</div>
			) : (
				<div className="flex flex-col md:flex-row">
					{/* Left panel — coach list */}
					<div className="md:w-[400px] md:border-r border-[#cbdbcc] md:min-h-[calc(100vh-5rem)]">
						<div className="px-4 h-11 border-b border-[#cbdbcc] flex items-center">
							<p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#8aab8a]">
								Active Coaches — Season Hours
							</p>
						</div>
						<div className="divide-y divide-[#cbdbcc]">
							{coaches.map((coach) => {
								const stat = stats.find((s) => s.coachId === coach.id);
								const hrs = stat?.totalHours ?? 0;
								const practiceCount = stat?.practiceCount ?? 0;
								const active = selectedCoachId === coach.id;

								return (
									<button
										key={coach.id}
										type="button"
										onClick={() => setSelectedCoachId(coach.id)}
										className={cn(
											"w-full text-left px-5 py-5",
											active ? "bg-[#cbdbcc]" : "hover:bg-[#eef4f1]",
										)}
									>
										<div className="flex items-start justify-between">
											<div className="flex items-center gap-3">
												<Avatar
													name={coach.name}
													size="md"
													bgClass={active ? "bg-[#021e00]" : undefined}
													textClass={active ? "text-[#eef4f1]" : undefined}
												/>
												<div>
													<p className="text-[#021e00] font-semibold text-base">
														{coach.name}
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
											<span className="inline-flex items-center px-2 py-1 bg-[#298a29] text-white text-[10px] font-semibold tracking-[0.08em] uppercase ">
												{practiceCount} Practices
											</span>
										</div>
									</button>
								);
							})}
						</div>
					</div>

					{/* Right panel — practice history */}
					{selectedCoach && (
						<div className="flex-1">
							<div className="px-5 md:px-6 h-11 border-b border-[#cbdbcc] flex items-center justify-between">
								<p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#8aab8a]">
									{selectedCoach.name} — Practice History
								</p>
								{selectedStat && (
									<p className="text-[#298a29] text-sm font-semibold">
										{selectedStat.totalHours.toFixed(1)} hrs total
									</p>
								)}
							</div>
							<div className="divide-y divide-[#cbdbcc]">
								{displayedPractices.length === 0 ? (
									<div className="px-6 py-12 text-center">
										<p className="text-[#8aab8a] text-sm">
											No practices recorded
										</p>
									</div>
								) : (
									displayedPractices.map((practice) => {
										const pc = practice.practiceCoaches.find(
											(x) => x.coachId === selectedCoachId,
										);
										const hrs = pc ? pc.durationMinutes / 60 : 1.5;
										return (
											<div
												key={practice.id}
												className="flex items-center justify-between px-5 md:px-6 py-4"
											>
												<div>
													<p className="text-[#021e00] font-medium text-sm">
														{getPracticeTitle(practice)}
													</p>
													<p className="text-[#4a8a40] text-xs mt-0.5">
														{formatMonthDay(practice.date).replace("", "")}
													</p>
												</div>
												<p className="text-[#8aab8a] text-sm font-medium">
													{hrs.toFixed(1)} hrs
												</p>
											</div>
										);
									})
								)}
								{morePractices > 0 && (
									<button
										type="button"
										className="w-full text-left px-5 md:px-6 py-4 hover:bg-[#eef4f1] "
										onClick={() => setShowAllPractices(true)}
									>
										<p className="text-[#298a29] text-sm font-medium">
											+ {morePractices} more practices
										</p>
									</button>
								)}
								{showAllPractices && coachPractices.length > 5 && (
									<button
										type="button"
										className="w-full text-left px-5 md:px-6 py-4 hover:bg-[#eef4f1] "
										onClick={() => setShowAllPractices(false)}
									>
										<p className="text-[#8aab8a] text-sm font-medium">
											Show less
										</p>
									</button>
								)}
							</div>
						</div>
					)}
				</div>
			)}

			{(showAddModal || editingCoach) && (
				<AddEditCoachModal
					coach={editingCoach}
					onClose={() => {
						setShowAddModal(false);
						setEditingCoach(null);
					}}
					onSaved={() => {
						setShowAddModal(false);
						setEditingCoach(null);
						fetchData();
					}}
				/>
			)}
		</div>
	);
}
