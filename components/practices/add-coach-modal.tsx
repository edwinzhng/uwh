"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import type { CoachWithPlayer } from "@/components/coaches/add-edit-coach-modal";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
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

export function AddCoachModal({
	practice,
	coaches,
	onClose,
	onSaved,
}: AddCoachModalProps) {
	const assignedCoachIds = practice.practiceCoaches.map(
		(pc: PracticeCoachJoin) => pc.coachId,
	);
	const [selectedIds, setSelectedIds] = useState<Id<"coaches">[]>(
		assignedCoachIds as Id<"coaches">[],
	);
	const [saving, setSaving] = useState(false);

	const setPracticeCoaches = useMutation(api.practices.setPracticeCoaches);

	const toggle = (id: Id<"coaches">) => {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			await setPracticeCoaches({
				practiceId: practice._id as Id<"practices">,
				coachIds: selectedIds as Id<"coaches">[],
			});
			onSaved();
		} catch (err) {
			console.error(err);
			setSaving(false);
		}
	};

	const dateLabel = `${formatMonthDay(practice.date).split(" ")[0]} ${formatMonthDay(practice.date).split(" ")[1]}`;

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				subtitle={`SAT ${dateLabel.toUpperCase()}`}
				title="Add Coach"
			>
				{/* Currently assigned */}
				{selectedIds.length > 0 && (
					<div className="px-6 pt-4 pb-3 flex flex-wrap gap-2 border-b border-[#cbdbcc]">
						<p className="w-full text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-1">
							Currently Assigned
						</p>
						{selectedIds.map((id) => {
							const coach = coaches.find((c) => c._id === id);
							if (!coach) return null;
							const name = coach.player?.fullName || "Coach";
							const firstName = name.split(" ")[0];
							const lastInitial = name.split(" ")[1]?.[0] ?? "";
							return (
								<button
									key={id}
									type="button"
									onClick={() => toggle(id)}
									className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#021e00] text-[#eef4f1] text-xs font-medium"
								>
									{firstName}
									{lastInitial ? ` ${lastInitial}.` : ""}
									<span className="ml-1 text-[#8aab8a]">×</span>
								</button>
							);
						})}
					</div>
				)}

				{/* Coach list */}
				<div className="divide-y divide-[#cbdbcc]">
					{coaches
						.filter((c) => c.isActive)
						.map((coach) => {
							const assigned = selectedIds.includes(coach._id);
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
											<p className="text-[#8aab8a] text-xs">
												{/* Could show stats here */}
											</p>
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
