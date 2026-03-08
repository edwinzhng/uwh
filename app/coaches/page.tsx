"use client";

import { useQuery } from "convex/react";
import { useAtom } from "jotai";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
	AddEditCoachModal,
	type CoachWithPlayer,
} from "@/components/coaches/add-edit-coach-modal";
import { CoachListItem } from "@/components/coaches/coach-list-item";
import { PracticeHistoryList } from "@/components/coaches/practice-history-list";
import { type Season, SeasonPicker } from "@/components/coaches/season-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { selectedCoachIdAtom } from "@/lib/atoms";

function generateSeasons(): Season[] {
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
	const coachesData = useQuery(api.coaches.getCoaches);
	const rawPracticesData = useQuery(api.practices.getPastPractices);

	const [selectedCoachId, setSelectedCoachId] = useAtom(selectedCoachIdAtom);

	// Select the current season (index 1) which is exactly what generateSeasons index 1 is.
	const [season, setSeason] = useState(SEASONS[1]);
	const [showSeasonPicker, setShowSeasonPicker] = useState(false);
	const [showAddModal, setShowAddModal] = useState(false);
	const [editingCoach, setEditingCoach] = useState<CoachWithPlayer | null>(
		null,
	);
	const [showAllPractices, setShowAllPractices] = useState(false);

	const loading = coachesData === undefined || rawPracticesData === undefined;
	const safeCoachesData = coachesData ?? [];
	const safePracticesData = rawPracticesData ?? [];

	const seasonStartNum = new Date(season.start).getTime();
	const seasonEndNum = new Date(season.end).getTime();
	const practices = safePracticesData.filter(
		(p) => p.date >= seasonStartNum && p.date <= seasonEndNum,
	);

	const stats = safeCoachesData.map((coach) => {
		let totalMinutes = 0;
		let practiceCount = 0;
		practices.forEach((p) => {
			const pc = p.practiceCoaches.find((x) => x.coachId === coach._id);
			if (pc) {
				totalMinutes += pc.durationMinutes;
				practiceCount++;
			}
		});
		return {
			coachId: coach._id,
			totalHours: totalMinutes / 60,
			totalMinutes,
			practiceCount,
		};
	});

	const coaches = [...safeCoachesData]
		.filter((c) => c.isActive)
		.sort((a, b) => {
			const aHrs = stats.find((s) => s.coachId === a._id)?.totalHours ?? 0;
			const bHrs = stats.find((s) => s.coachId === b._id)?.totalHours ?? 0;
			return bHrs - aHrs;
		});

	useEffect(() => {
		if (!selectedCoachId && coaches.length > 0) {
			setSelectedCoachId(coaches[0]._id);
		}
	}, [coaches, selectedCoachId, setSelectedCoachId]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset practice collapse toggle when coach changes
	useEffect(() => {
		setShowAllPractices(false);
	}, [selectedCoachId]);

	const selectedCoach = coaches.find((c) => c._id === selectedCoachId);
	const selectedStat = stats.find((s) => s.coachId === selectedCoachId);

	// Practices coached by selected coach
	const coachPractices = practices
		.filter((p) =>
			p.practiceCoaches.some((pc) => pc.coachId === selectedCoachId),
		)
		.sort((a, b) => b.date - a.date);

	return (
		<div>
			<PageHeader
				eyebrow="Staff"
				title="Coaches"
				actions={
					<div className="flex items-center gap-2">
						<SeasonPicker
							seasons={SEASONS}
							currentSeason={season}
							onSelect={setSeason}
							isOpen={showSeasonPicker}
							onToggle={setShowSeasonPicker}
						/>
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
								const stat = stats.find((s) => s.coachId === coach._id);
								return (
									<CoachListItem
										key={coach._id}
										coach={coach}
										hrs={stat?.totalHours ?? 0}
										practiceCount={stat?.practiceCount ?? 0}
										isActive={selectedCoachId === coach._id}
										onClick={() => setSelectedCoachId(coach._id)}
									/>
								);
							})}
						</div>
					</div>

					{/* Right panel — practice history */}
					{selectedCoach && (
						<div className="flex-1">
							<div className="px-5 md:px-6 h-11 border-b border-[#cbdbcc] flex items-center justify-between">
								<p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#8aab8a]">
									{selectedCoach.player?.fullName || "Coach"} — Practice History
								</p>
								{selectedStat && (
									<p className="text-[#298a29] text-sm font-semibold">
										{selectedStat.totalHours.toFixed(1)} hrs total
									</p>
								)}
							</div>
							<PracticeHistoryList
								practices={coachPractices}
								selectedCoachId={selectedCoachId as string}
								showAll={showAllPractices}
								onToggleShowAll={setShowAllPractices}
							/>
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
					}}
				/>
			)}
		</div>
	);
}
