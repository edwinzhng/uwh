"use client";

import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import type { Coach } from "@/lib/api";
import { isDarkModeAtom } from "@/lib/atoms";
import { Button } from "../shared/button";
import { Modal } from "../shared/modal";

// Valid duration options
const VALID_DURATIONS = [60, 90, 120, 150, 180];

// Normalize duration to closest valid option
const normalizeToValidDuration = (dur: number) => {
	if (VALID_DURATIONS.includes(dur)) return dur;
	// Find closest valid duration
	return VALID_DURATIONS.reduce((prev, curr) => 
		Math.abs(curr - dur) < Math.abs(prev - dur) ? curr : prev
	);
};

interface CoachAssignmentModalProps {
	isOpen: boolean;
	onClose: () => void;
	coaches: Coach[];
	selectedCoachIds: number[];
	defaultDuration?: number;
	onSave: (coachIds: number[], durationMinutes: number) => Promise<void>;
}

export function CoachAssignmentModal({
	isOpen,
	onClose,
	coaches,
	selectedCoachIds,
	defaultDuration = 90,
	onSave,
}: CoachAssignmentModalProps) {
	const [isDarkMode] = useAtom(isDarkModeAtom);
	const [selectedCoaches, setSelectedCoaches] = useState<number[]>(selectedCoachIds);
	const [duration, setDuration] = useState<number>(normalizeToValidDuration(defaultDuration));
	const [isSaving, setIsSaving] = useState(false);

	// Update state when props change (e.g., when a different practice is selected)
	useEffect(() => {
		setSelectedCoaches(selectedCoachIds);
		setDuration(normalizeToValidDuration(defaultDuration));
	}, [selectedCoachIds, defaultDuration]);

	const toggleCoach = (coachId: number) => {
		setSelectedCoaches((prev) =>
			prev.includes(coachId)
				? prev.filter((id) => id !== coachId)
				: [...prev, coachId],
		);
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await onSave(selectedCoaches, duration);
			onClose();
		} catch (error) {
			console.error("Failed to save coaches:", error);
		} finally {
			setIsSaving(false);
		}
	};

	const handleClose = () => {
		setSelectedCoaches(selectedCoachIds);
		setDuration(defaultDuration);
		onClose();
	};

	return (
		<Modal isOpen={isOpen} onClose={handleClose} title="Assign Coaches">
			<div className="space-y-4">
				<div>
					<p
						className={`text-sm mb-3 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Duration
					</p>
					<select
						value={duration}
						onChange={(e) => setDuration(Number(e.target.value))}
						className={`
							w-full px-3 py-2 rounded-lg border transition-colors
							${
								isDarkMode
									? "bg-gray-800/40 border-gray-700 text-white focus:border-blue-500"
									: "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
							}
							focus:outline-none focus:ring-2 focus:ring-blue-500/20
						`}
					>
						<option value={60}>1 hour</option>
						<option value={90}>1.5 hours</option>
						<option value={120}>2 hours</option>
						<option value={150}>2.5 hours</option>
						<option value={180}>3 hours</option>
					</select>
				</div>

				<div>
					<p
						className={`text-sm mb-3 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Select Coaches
					</p>
					<div className="space-y-2">
						{coaches
							.filter((c) => c.isActive)
							.map((coach) => (
								<label
									key={coach.id}
									className={`
										flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200
										${
											selectedCoaches.includes(coach.id)
												? isDarkMode
													? "bg-blue-900/40 border border-blue-700"
													: "bg-blue-100 border border-blue-300"
												: isDarkMode
													? "bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60"
													: "bg-white/40 border border-gray-200/50 hover:bg-white/60"
										}
									`}
								>
									<input
										type="checkbox"
										checked={selectedCoaches.includes(coach.id)}
										onChange={() => toggleCoach(coach.id)}
										className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
									/>
									<span
										className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
									>
										{coach.name}
									</span>
								</label>
							))}
					</div>
				</div>

				<Button
					onClick={handleSave}
					loading={isSaving}
					className="mt-4 bg-blue-600 hover:bg-blue-700 text-white w-full"
				>
					{isSaving ? "Saving..." : "Save Coaches"}
				</Button>
			</div>
		</Modal>
	);
}

