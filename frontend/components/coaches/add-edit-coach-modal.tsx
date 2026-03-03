"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { apiClient, type Coach } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AddEditCoachModalProps {
	coach: Coach | null;
	onClose: () => void;
	onSaved: () => void;
}

export function AddEditCoachModal({
	coach,
	onClose,
	onSaved,
}: AddEditCoachModalProps) {
	const [name, setName] = useState(coach?.name ?? "");
	const [isActive, setIsActive] = useState(coach?.isActive ?? true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const handleSave = async () => {
		if (!name.trim()) {
			setError("Name is required");
			return;
		}
		setSaving(true);
		try {
			if (coach) {
				await apiClient.updateCoach(coach.id, { name: name.trim(), isActive });
			} else {
				await apiClient.createCoach({ name: name.trim(), isActive });
			}
			onSaved();
		} catch (err) {
			console.error(err);
			setSaving(false);
		}
	};

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				subtitle="Staff"
				title={coach ? "Edit Coach" : "Add Coach"}
			>
				<div className="px-6 pt-5 pb-4 space-y-5">
					<div>
						<label
							htmlFor="coachName"
							className="block text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-1.5"
						>
							Name
						</label>
						<input
							id="coachName"
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								setError("");
							}}
							placeholder="Coach name"
							className="w-full h-11  border border-[#cbdbcc] bg-white px-3 text-sm text-[#021e00] focus:outline-none focus:border-[#298a29]"
						/>
						{error && <p className="text-red-500 text-xs mt-1">{error}</p>}
					</div>

					<div>
						<span className="block text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-1.5">
							Status
						</span>
						<div className="flex  border border-[#cbdbcc] overflow-hidden">
							<button
								type="button"
								onClick={() => setIsActive(true)}
								className={cn(
									"flex-1 py-2.5 text-xs font-semibold tracking-[0.08em] uppercase ",
									isActive
										? "bg-[#021e00] text-[#eef4f1]"
										: "bg-white text-[#021e00] hover:bg-[#eef4f1]",
								)}
							>
								Active
							</button>
							<button
								type="button"
								onClick={() => setIsActive(false)}
								className={cn(
									"flex-1 py-2.5 text-xs font-semibold tracking-[0.08em] uppercase ",
									!isActive
										? "bg-[#021e00] text-[#eef4f1]"
										: "bg-white text-[#021e00] hover:bg-[#eef4f1]",
								)}
							>
								Inactive
							</button>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} className="flex-1">
						Cancel
					</Button>
					<Button onClick={handleSave} loading={saving} className="flex-1">
						{coach ? "Save Changes" : "Add Coach"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
