"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

export type CoachWithPlayer = Doc<"coaches"> & {
	player: Doc<"players"> | null;
};

interface AddEditCoachModalProps {
	coach: CoachWithPlayer | null;
	onClose: () => void;
	onSaved: () => void;
}

export function AddEditCoachModal({
	coach,
	onClose,
	onSaved,
}: AddEditCoachModalProps) {
	const [playerId, setPlayerId] = useState<string>("");
	const [isActive, setIsActive] = useState(coach?.isActive ?? true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const players = useQuery(api.players.getPlayers);
	const coaches = useQuery(api.coaches.getCoaches);
	const createCoach = useMutation(api.coaches.createCoach);
	const updateCoach = useMutation(api.coaches.updateCoach);

	const availablePlayers = (players ?? [])
		.filter((p) => !coaches?.some((c) => c.playerId === p._id))
		.sort((a, b) => a.fullName.localeCompare(b.fullName));

	const handleSave = async () => {
		if (!coach && !playerId) {
			setError("Select a player first");
			return;
		}
		setSaving(true);
		try {
			if (coach) {
				await updateCoach({ id: coach._id, isActive });
			} else {
				await createCoach({ playerId: playerId as Id<"players">, isActive });
			}
			onSaved();
		} catch (err) {
			console.error(err);
			setError(err instanceof Error ? err.message : "An error occurred");
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
							htmlFor="coachPlayer"
							className="block text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-1.5"
						>
							Player
						</label>
						{coach ? (
							<div className="flex items-center gap-3 px-4 py-3 bg-[#eef4f1] border border-[#cbdbcc]">
								<Avatar name={coach.player?.fullName ?? ""} size="sm" />
								<div>
									<p className="text-[#021e00] text-sm font-semibold">
										{coach.player?.fullName}
									</p>
								</div>
							</div>
						) : (
							<select
								id="coachPlayer"
								value={playerId}
								onChange={(e) => {
									setPlayerId(e.target.value);
									setError("");
								}}
								className="w-full h-11 border border-[#cbdbcc] bg-white px-3 text-sm text-[#021e00] focus:outline-none focus:border-[#298a29]"
							>
								<option value="" disabled>
									Select a player
								</option>
								{availablePlayers.map((p) => (
									<option key={p._id} value={p._id}>
										{p.fullName}
									</option>
								))}
							</select>
						)}
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
