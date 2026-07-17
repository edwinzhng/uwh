"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import type { CoachWithPlayer } from "@/components/coaches/add-edit-coach-modal";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/field-label";
import { Muted } from "@/components/ui/typography";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { getDefaultPracticeDurationMinutes } from "@/convex/practiceDuration";
import { useToast } from "@/lib/toast";
import { cn, formatMonthDay } from "@/lib/utils";

export type PracticeCoachJoin = Doc<"practiceCoaches"> & { coachName: string };
export type PracticeWithCoaches = Doc<"practices"> & {
	practiceCoaches: PracticeCoachJoin[];
};

interface AddCoachModalProps {
	practice: PracticeWithCoaches;
	coaches: CoachWithPlayer[];
	onClose: () => void;
	onSaved: () => void;
}

type CoachAssignment = {
	coachId: Id<"coaches">;
	hours: string;
};

export function AddCoachModal({
	practice,
	coaches,
	onClose,
	onSaved,
}: AddCoachModalProps) {
	const [assignments, setAssignments] = useState<CoachAssignment[]>(
		practice.practiceCoaches.map(({ coachId, durationMinutes }) => ({
			coachId,
			hours: String(durationMinutes / 60),
		})),
	);
	const [saving, setSaving] = useState(false);
	const toast = useToast();

	const setPracticeCoaches = useMutation(
		api.practiceCoaches.setPracticeCoaches,
	);

	const toggle = (coachId: Id<"coaches">): void => {
		setAssignments((currentAssignments) =>
			currentAssignments.some((assignment) => assignment.coachId === coachId)
				? currentAssignments.filter(
						(assignment) => assignment.coachId !== coachId,
					)
				: [
						...currentAssignments,
						{
							coachId,
							hours: String(
								getDefaultPracticeDurationMinutes(practice.date) / 60,
							),
						},
					],
		);
	};

	const updateHours = (coachId: Id<"coaches">, hours: string): void => {
		setAssignments((currentAssignments) =>
			currentAssignments.map((assignment) =>
				assignment.coachId === coachId ? { ...assignment, hours } : assignment,
			),
		);
	};

	const handleSave = async (): Promise<void> => {
		const hasInvalidHours = assignments.some(({ hours }) => {
			const parsedHours = Number(hours);
			return (
				!Number.isFinite(parsedHours) ||
				parsedHours < 0.25 ||
				parsedHours > 24 ||
				!Number.isInteger(parsedHours * 4)
			);
		});
		if (hasInvalidHours) {
			toast.error(
				"Coach hours must be between 0.25 and 24 hours in 0.25-hour increments",
			);
			return;
		}

		setSaving(true);
		try {
			await setPracticeCoaches({
				practiceId: practice._id,
				coaches: assignments.map(({ coachId, hours }) => ({
					coachId,
					durationMinutes: Math.round(Number(hours) * 60),
				})),
			});
			toast.success("Coaches updated");
			onSaved();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to update coaches.",
			);
			setSaving(false);
		}
	};

	const dateLabel = formatMonthDay(practice.date);
	const weekdayLabel = new Date(practice.date).toLocaleDateString("en-US", {
		timeZone: "America/Edmonton",
		weekday: "short",
	});

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				subtitle={`${weekdayLabel.toUpperCase()} ${dateLabel}`}
				title="Edit Coaches"
			>
				{assignments.length > 0 && (
					<div className="px-6 pt-4 pb-3 space-y-3 border-b border-[#cbdbcc]">
						<FieldLabel>Currently Assigned</FieldLabel>
						{assignments.map(({ coachId, hours }) => {
							const coach = coaches.find((c) => c._id === coachId);
							if (!coach) return null;
							const name = coach.player?.fullName || "Coach";
							return (
								<div
									key={coachId}
									className="flex items-center justify-between gap-3"
								>
									<p className="min-w-0 flex-1 truncate text-sm font-medium text-[#021e00]">
										{name}
									</p>
									<div className="flex items-center gap-2">
										<input
											aria-label={`${name} hours`}
											type="number"
											min="0.25"
											max="24"
											step="0.25"
											value={hours}
											onChange={(event) =>
												updateHours(coachId, event.target.value)
											}
											className="h-9 w-20 border border-[#cbdbcc] bg-white px-2 text-right text-sm text-[#021e00] focus:border-[#298a29] focus:outline-none"
										/>
										<span className="text-xs text-[#4a8a40]">hrs</span>
										<button
											type="button"
											onClick={() => toggle(coachId)}
											className="h-9 px-2 text-xs text-[#8aab8a] hover:text-red-500"
										>
											Remove
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}

				<div className="divide-y divide-[#cbdbcc]">
					{coaches
						.filter((c) => c.isActive)
						.map((coach) => {
							const assigned = assignments.some(
								(assignment) => assignment.coachId === coach._id,
							);
							return (
								<div
									key={coach._id}
									className="flex items-center justify-between px-6 py-4"
								>
									<div className="flex items-center gap-3">
										<Avatar
											name={coach.player?.fullName ?? ""}
											size="sm"
											bgClass={assigned ? "bg-[#021e00]" : undefined}
										/>
										<div>
											<p className="text-[#021e00] font-medium text-sm">
												{coach.player?.fullName ?? ""}
											</p>
											<Muted />
										</div>
									</div>
									<button
										type="button"
										onClick={() => toggle(coach._id)}
										className={cn(
											"h-8 px-4 text-xs font-semibold tracking-[0.08em] uppercase  ",
											assigned
												? "bg-[#cbdbcc] text-[#4a8a40]"
												: "border border-[#021e00] text-[#021e00] hover:bg-[#021e00] hover:text-[#eef4f1]",
										)}
									>
										{assigned ? "Assigned" : "+ Add"}
									</button>
								</div>
							);
						})}
				</div>

				<DialogFooter className="flex-col gap-2">
					<Button onClick={handleSave} loading={saving} className="w-full">
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
