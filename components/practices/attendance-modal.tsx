"use client";

import { useMutation, useQuery } from "convex/react";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/lib/toast";
import { cn, formatMonthDay } from "@/lib/utils";

interface AttendanceModalProps {
	practiceId: Id<"practices">;
	practiceDate: number;
	onClose: () => void;
}

export function AttendanceModal({
	practiceId,
	practiceDate,
	onClose,
}: AttendanceModalProps) {
	const toast = useToast();
	const allPlayers = useQuery(api.players.getPlayers);
	const attendanceRecords = useQuery(api.attendance.getPracticeAttendance, {
		practiceId,
	});

	// Local override state: playerId → attended boolean
	const [overrides, setOverrides] = useState<Record<string, boolean>>({});
	const [saving, setSaving] = useState(false);

	const upsertAttendance = useMutation(api.attendance.upsertAttendance);

	const loading = allPlayers === undefined || attendanceRecords === undefined;

	// Build attendance map from DB
	const dbAttendance = new Map<string, boolean>();
	if (attendanceRecords) {
		for (const r of attendanceRecords) {
			dbAttendance.set(r.playerId, r.attended);
		}
	}

	const getAttended = (playerId: string): boolean | null => {
		if (playerId in overrides) return overrides[playerId];
		const db = dbAttendance.get(playerId);
		return db ?? null;
	};

	const toggle = (playerId: string) => {
		const current = getAttended(playerId);
		setOverrides((prev) => ({ ...prev, [playerId]: !current }));
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			await Promise.all(
				Object.entries(overrides).map(([playerId, attended]) =>
					upsertAttendance({
						practiceId,
						playerId: playerId as Id<"players">,
						attended,
					}),
				),
			);
			toast.success("Attendance saved");
			onClose();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to save attendance",
			);
			setSaving(false);
		}
	};

	const dateLabel = formatMonthDay(practiceDate);
	const players = allPlayers ?? [];
	const adults = players.filter((p) => !p.youth);
	const youth = players.filter((p) => p.youth);

	const attendedCount = players.filter(
		(p) => getAttended(p._id) === true,
	).length;

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent title="Attendance" subtitle={dateLabel}>
				{loading ? (
					<div className="flex items-center justify-center py-16">
						<div className="h-5 w-5 border-2 border-[#298a29] border-t-transparent rounded-full animate-spin" />
					</div>
				) : (
					<>
						{/* Summary */}
						<div className="px-6 py-3 border-b border-[#cbdbcc] flex items-center justify-between">
							<p className="text-xs text-[#8aab8a]">
								Tap players to mark attendance
							</p>
							<p className="text-xs font-semibold text-[#021e00]">
								{attendedCount} / {players.length} present
							</p>
						</div>

						{/* Player list */}
						<div className="overflow-y-auto max-h-[50vh]">
							{adults.length > 0 && (
								<PlayerSection
									label="Adult"
									players={adults}
									getAttended={getAttended}
									onToggle={toggle}
								/>
							)}
							{youth.length > 0 && (
								<PlayerSection
									label="Youth"
									players={youth}
									getAttended={getAttended}
									onToggle={toggle}
								/>
							)}
						</div>
					</>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={onClose} className="flex-1">
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						loading={saving}
						disabled={Object.keys(overrides).length === 0}
						className="flex-1"
					>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function PlayerSection({
	label,
	players,
	getAttended,
	onToggle,
}: {
	label: string;
	players: Array<{ _id: string; fullName: string }>;
	getAttended: (id: string) => boolean | null;
	onToggle: (id: string) => void;
}) {
	return (
		<div>
			<p className="px-6 py-2 text-[10px] font-semibold tracking-[0.1em] uppercase text-[#8aab8a] bg-[#f5f9f5] border-b border-[#cbdbcc]">
				{label}
			</p>
			{players.map((player) => {
				const attended = getAttended(player._id);
				return (
					<button
						key={player._id}
						type="button"
						onClick={() => onToggle(player._id)}
						className={cn(
							"w-full flex items-center justify-between px-6 py-3.5 border-b border-[#cbdbcc] transition-colors",
							attended === true && "bg-[#eef4f1]",
							attended === false && "bg-red-50",
						)}
					>
						<span
							className={cn(
								"text-sm font-medium",
								attended === true && "text-[#021e00]",
								attended === false && "text-red-700",
								attended === null && "text-[#8aab8a]",
							)}
						>
							{player.fullName}
						</span>
						<span
							className={cn(
								"h-7 w-7 flex items-center justify-center border",
								attended === true && "bg-[#298a29] border-[#298a29] text-white",
								attended === false && "bg-red-100 border-red-300 text-red-600",
								attended === null &&
									"bg-white border-[#cbdbcc] text-transparent",
							)}
						>
							{attended === true && <Check className="h-4 w-4" />}
							{attended === false && <X className="h-4 w-4" />}
						</span>
					</button>
				);
			})}
		</div>
	);
}
