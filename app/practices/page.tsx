"use client";

import { useMutation, useQuery } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import {
	AddCoachModal,
	type PracticeCoachJoin,
	type PracticeWithCoaches,
} from "@/components/practices/add-coach-modal";
import { AddPracticeModal } from "@/components/practices/add-practice-modal";
import { AttendanceModal } from "@/components/practices/attendance-modal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/lib/toast";
import {
	cn,
	formatDayTime,
	formatMonthDay,
	getPracticeTitle,
} from "@/lib/utils";

export default function PracticesPage() {
	const upcomingRaw = useQuery(api.practices.getUpcomingPractices);
	const pastRaw = useQuery(api.practices.getPastPractices);
	const coachesRaw = useQuery(api.coaches.getCoaches);

	const loading =
		upcomingRaw === undefined ||
		pastRaw === undefined ||
		coachesRaw === undefined;
	const practices = upcomingRaw ?? [];
	const pastPractices = pastRaw ?? [];
	const coaches = coachesRaw ?? [];

	const toast = useToast();
	const deletePractice = useMutation(api.practices.deletePractice);

	const [view, setView] = useState<"UPCOMING" | "PAST">("UPCOMING");
	const [addCoachPractice, setAddCoachPractice] =
		useState<PracticeWithCoaches | null>(null);
	const [showAddPractice, setShowAddPractice] = useState(false);
	const [attendancePractice, setAttendancePractice] = useState<{
		id: Id<"practices">;
		date: number;
	} | null>(null);
	const [deletingPractice, setDeletingPractice] = useState<{
		id: Id<"practices">;
		title: string;
	} | null>(null);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const handleDelete = async () => {
		if (!deletingPractice) return;
		setDeleteLoading(true);
		try {
			await deletePractice({ id: deletingPractice.id });
			toast.success("Practice deleted");
			setDeletingPractice(null);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to delete practice",
			);
		} finally {
			setDeleteLoading(false);
		}
	};

	const displayed = view === "UPCOMING" ? practices : pastPractices;
	const nextPractice = practices[0] ?? null;

	return (
		<div>
			<PageHeader
				eyebrow="Schedule"
				title="Practices"
				actions={
					<>
						<Button
							variant="outline"
							size="sm"
							className="h-7 px-2.5 text-[10px]"
							onClick={() => setShowAddPractice(true)}
						>
							+ Add Practice
						</Button>
						<SegmentedControl
							options={[
								{ label: "Upcoming", value: "UPCOMING" },
								{ label: "Past", value: "PAST" },
							]}
							value={view}
							onChange={(v) => setView(v as "UPCOMING" | "PAST")}
						/>
					</>
				}
			/>

			{/* Mobile next practice card */}
			{view === "UPCOMING" && nextPractice && (
				<div className="md:hidden bg-[#eef4f1] px-4 py-4 border-b border-[#cbdbcc]">
					<p className="text-[#4a8a40] text-[10px] font-semibold tracking-[0.12em] uppercase mb-1">
						Next · {formatMonthDay(nextPractice.date)}
					</p>
					<div className="flex items-start justify-between">
						<div>
							<h2 className="text-[#021e00] text-xl font-bold leading-tight">
								{getPracticeTitle(nextPractice)}
							</h2>
							<p className="text-[#4a8a40] text-sm mt-0.5">
								7:00 PM · MNP Sport Centre
							</p>
							<div className="flex flex-wrap gap-1.5 mt-2">
								{nextPractice.practiceCoaches.length > 0
									? nextPractice.practiceCoaches.map(
											(pc: PracticeCoachJoin) => (
												<span
													key={pc._id}
													className="text-xs px-2 py-0.5 bg-[#cbdbcc] text-[#4a8a40] font-medium"
												>
													{pc.coachName.split(" ")[0]}
													{pc.coachName.split(" ")[1]
														? ` ${pc.coachName.split(" ")[1][0]}.`
														: ""}
												</span>
											),
										)
									: null}
							</div>
						</div>
						<div className="text-right">
							<Link
								href={`/practices/${nextPractice.sporteasyId ?? nextPractice._id}/plan`}
								className="mt-2 inline-flex items-center justify-center h-9 px-4 bg-transparent border border-[#021e00] text-[#021e00] text-xs font-semibold tracking-[0.08em] uppercase hover:bg-[#021e00] hover:text-[#eef4f1] "
							>
								Plan
							</Link>
						</div>
					</div>
				</div>
			)}

			{/* Table header */}
			<div className="hidden md:grid grid-cols-[200px_1fr_200px_100px] gap-0 px-6 py-3 border-b border-[#cbdbcc] bg-[#eef4f1]">
				<span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#8aab8a]">
					Date
				</span>
				<span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#8aab8a]">
					Event
				</span>
				<span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#8aab8a]">
					Coaches
				</span>
				<span />
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-24">
					<div className="h-6 w-6 border-2 border-[#298a29] border-t-transparent rounded-full animate-spin" />
				</div>
			) : displayed.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-24 text-center">
					<p className="text-[#021e00] text-lg font-medium">No practices</p>
					<p className="text-[#8aab8a] text-sm mt-1">
						{view === "UPCOMING"
							? "No upcoming practices scheduled"
							: "No past practices found"}
					</p>
				</div>
			) : (
				<div>
					{displayed.map((practice, i) => (
						<PracticeRow
							key={practice._id}
							practice={practice}
							isFirst={i === 0 && view === "UPCOMING"}
							onAddCoach={() => setAddCoachPractice(practice)}
							onAttendance={() =>
								setAttendancePractice({
									id: practice._id,
									date: practice.date,
								})
							}
							onDelete={() =>
								setDeletingPractice({
									id: practice._id,
									title: getPracticeTitle(practice),
								})
							}
						/>
					))}
				</div>
			)}

			{addCoachPractice && (
				<AddCoachModal
					practice={addCoachPractice}
					coaches={coaches}
					onClose={() => setAddCoachPractice(null)}
					onSaved={() => {
						setAddCoachPractice(null);
					}}
				/>
			)}

			{showAddPractice && (
				<AddPracticeModal
					onClose={() => setShowAddPractice(false)}
					onSaved={() => setShowAddPractice(false)}
				/>
			)}

			{attendancePractice && (
				<AttendanceModal
					practiceId={attendancePractice.id}
					practiceDate={attendancePractice.date}
					onClose={() => setAttendancePractice(null)}
				/>
			)}

			<ConfirmDialog
				open={deletingPractice !== null}
				title="Delete Practice"
				description={`Delete "${deletingPractice?.title}"? This will also remove all associated attendance records and cannot be undone.`}
				confirmLabel="Delete"
				destructive
				loading={deleteLoading}
				onConfirm={handleDelete}
				onCancel={() => setDeletingPractice(null)}
			/>
		</div>
	);
}

function PracticeRow({
	practice,
	isFirst,
	onAddCoach,
	onAttendance,
	onDelete,
}: {
	practice: PracticeWithCoaches;
	isFirst: boolean;
	onAddCoach: () => void;
	onAttendance: () => void;
	onDelete: () => void;
}) {
	const dateStr = formatMonthDay(practice.date);
	const dayTime = formatDayTime(practice.date);
	const title = getPracticeTitle(practice);

	return (
		<>
			{/* Desktop row */}
			<div
				className={cn(
					"hidden md:grid grid-cols-[200px_1fr_200px_auto] gap-0 px-6 py-5 border-b border-[#cbdbcc] items-center",
					isFirst && "bg-white/40",
				)}
			>
				{/* Date */}
				<div>
					<p className="text-[#021e00] text-lg font-bold tracking-wide">
						{dateStr.replace("", "")}
					</p>
					<p className="text-[#8aab8a] text-xs mt-0.5">{dayTime}</p>
				</div>

				{/* Event */}
				<div>
					<p className="text-[#021e00] font-medium">{title}</p>
					<p className="text-[#4a8a40] text-xs mt-0.5">
						MNP Community &amp; Sport Centre
					</p>
				</div>

				{/* Coaches */}
				<div className="flex flex-wrap gap-1.5 items-center">
					{practice.practiceCoaches.length > 0 ? (
						practice.practiceCoaches.map((pc: PracticeCoachJoin) => (
							<span
								key={pc._id}
								className="inline-flex items-center px-2 py-1 bg-[#cbdbcc] text-[#4a8a40] text-xs font-medium"
							>
								{pc.coachName.split(" ")[0]}
								{pc.coachName.split(" ")[1]
									? ` ${pc.coachName.split(" ")[1][0]}.`
									: ""}
							</span>
						))
					) : (
						<button
							type="button"
							onClick={onAddCoach}
							className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-[#cbdbcc] text-[#8aab8a] text-xs hover:border-[#298a29] hover:text-[#298a29] "
						>
							<Plus className="h-3 w-3" />
							Add Coach
						</button>
					)}
					{practice.practiceCoaches.length > 0 && (
						<button
							type="button"
							onClick={onAddCoach}
							className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-[#cbdbcc] text-[#8aab8a] text-xs hover:border-[#298a29] hover:text-[#298a29] "
						>
							<Plus className="h-3 w-3" />
							Edit
						</button>
					)}
				</div>

				{/* Actions */}
				<div className="flex items-center gap-2 justify-end">
					<button
						type="button"
						onClick={onAttendance}
						className="inline-flex items-center justify-center h-9 px-3 text-xs font-semibold tracking-[0.08em] uppercase border border-[#cbdbcc] text-[#4a8a40] hover:border-[#298a29] hover:text-[#298a29]"
					>
						Attendance
					</button>
					<Link
						href={`/practices/${practice.sporteasyId ?? practice._id}/plan`}
						className={cn(
							"inline-flex items-center justify-center h-9 px-4 text-xs font-semibold tracking-[0.08em] uppercase ",
							isFirst
								? "bg-[#298a29] text-white hover:bg-[#1f6b1f]"
								: "border border-[#021e00] text-[#021e00] hover:bg-[#021e00] hover:text-[#eef4f1]",
						)}
					>
						Plan
					</Link>
					<button
						type="button"
						onClick={onDelete}
						className="inline-flex items-center justify-center h-9 w-9 border border-[#cbdbcc] text-[#8aab8a] hover:border-red-300 hover:text-red-500"
					>
						<Trash2 className="h-4 w-4" />
					</button>
				</div>
			</div>

			{/* Mobile row (skip first since we have the featured card) */}
			<div
				className={cn(
					"md:hidden px-4 py-4 border-b border-[#cbdbcc]",
					isFirst && "hidden",
				)}
			>
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-0.5">
							<span className="text-[#021e00] font-bold text-sm">
								{dateStr}
							</span>
							<span className="text-[#8aab8a] text-xs">
								{dayTime.split("· ")[0]}
							</span>
						</div>
						<p className="text-[#021e00] font-medium text-sm">{title}</p>
						<div className="flex items-center gap-2 mt-1.5">
							{practice.practiceCoaches.length === 0 ? (
								<button
									type="button"
									onClick={onAddCoach}
									className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] border border-dashed border-[#cbdbcc] text-[#8aab8a] "
								>
									+ Coach
								</button>
							) : (
								practice.practiceCoaches.map((pc) => (
									<span
										key={pc._id}
										className="text-[10px] px-1.5 py-0.5 bg-[#cbdbcc] text-[#4a8a40] "
									>
										{pc.coachName.split(" ")[0]}
										{pc.coachName.split(" ")[1]
											? ` ${pc.coachName.split(" ")[1][0]}.`
											: ""}
									</span>
								))
							)}
						</div>
					</div>
					<div className="ml-4 flex flex-col gap-1.5">
						<Link
							href={`/practices/${practice.sporteasyId ?? practice._id}/plan`}
							className="inline-flex items-center justify-center h-9 px-4 border border-[#021e00] text-[#021e00] text-xs font-semibold tracking-[0.08em] uppercase"
						>
							Plan
						</Link>
						<button
							type="button"
							onClick={onAttendance}
							className="inline-flex items-center justify-center h-8 px-3 border border-[#cbdbcc] text-[#4a8a40] text-[10px] font-semibold tracking-[0.08em] uppercase"
						>
							Attendance
						</button>
						<button
							type="button"
							onClick={onDelete}
							className="inline-flex items-center justify-center h-8 w-full border border-[#cbdbcc] text-[#8aab8a] hover:border-red-300 hover:text-red-500"
						>
							<Trash2 className="h-3.5 w-3.5" />
						</button>
					</div>
				</div>
			</div>
		</>
	);
}
