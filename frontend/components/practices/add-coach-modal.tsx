"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { apiClient, type Coach, type Practice } from "@/lib/api";
import { cn, formatMonthDay } from "@/lib/utils";

interface AddCoachModalProps {
	practice: Practice;
	coaches: Coach[];
	onClose: () => void;
	onSaved: () => void;
}

export function AddCoachModal({
	practice,
	coaches,
	onClose,
	onSaved,
}: AddCoachModalProps) {
	const assignedCoachIds = practice.practiceCoaches.map((pc) => pc.coachId);
	const [selectedIds, setSelectedIds] = useState<number[]>(assignedCoachIds);
	const [saving, setSaving] = useState(false);

	const toggle = (id: number) => {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			await apiClient.setPracticeCoaches(practice.id, selectedIds);
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
							const coach = coaches.find((c) => c.id === id);
							if (!coach) return null;
							const firstName = coach.name.split(" ")[0];
							const lastInitial = coach.name.split(" ")[1]?.[0] ?? "";
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
							const assigned = selectedIds.includes(coach.id);
							return (
								<div
									key={coach.id}
									className="flex items-center justify-between px-6 py-4"
								>
									<div className="flex items-center gap-3">
										<Avatar name={coach.name} size="sm" />
										<div>
											<p className="text-[#021e00] font-medium text-sm">
												{coach.name}
											</p>
											<p className="text-[#8aab8a] text-xs">
												{/* Could show stats here */}
											</p>
										</div>
									</div>
									<button
										type="button"
										onClick={() => toggle(coach.id)}
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
