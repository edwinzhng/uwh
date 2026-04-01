"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const DAYS = [
	{ label: "Su", value: 0 },
	{ label: "Mo", value: 1 },
	{ label: "Tu", value: 2 },
	{ label: "We", value: 3 },
	{ label: "Th", value: 4 },
	{ label: "Fr", value: 5 },
	{ label: "Sa", value: 6 },
];

function parseLocalDate(dateStr: string): Date {
	const [year, month, day] = dateStr.split("-").map(Number);
	// Store at noon local time to avoid DST / timezone edge cases
	return new Date(year, month - 1, day, 12, 0, 0);
}

function generateDates(
	startDate: string,
	isRecurring: boolean,
	selectedDays: number[],
	endDate: string,
): number[] {
	const start = parseLocalDate(startDate);
	if (!isRecurring) return [start.getTime()];

	const end = parseLocalDate(endDate);
	if (end < start) return [];

	const dates: number[] = [];
	const current = new Date(start);
	while (current <= end) {
		if (selectedDays.includes(current.getDay())) {
			dates.push(current.getTime());
		}
		current.setDate(current.getDate() + 1);
	}
	return dates;
}

interface AddPracticeModalProps {
	onClose: () => void;
	onSaved: (count: number) => void;
}

export function AddPracticeModal({ onClose, onSaved }: AddPracticeModalProps) {
	const today = new Date().toISOString().split("T")[0];

	const [startDate, setStartDate] = useState(today);
	const [isRecurring, setIsRecurring] = useState(false);
	const [selectedDays, setSelectedDays] = useState<number[]>([]);
	const [endDate, setEndDate] = useState("");
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const createPractices = useMutation(api.practices.createPractices);
	const toast = useToast();

	const toggleDay = (day: number) => {
		setSelectedDays((prev) =>
			prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
		);
	};

	const previewDates = startDate
		? generateDates(startDate, isRecurring, selectedDays, endDate)
		: [];

	const handleSave = async () => {
		setError("");

		if (!startDate) {
			setError("Start date is required.");
			return;
		}
		if (isRecurring) {
			if (selectedDays.length === 0) {
				setError("Select at least one day of the week.");
				return;
			}
			if (!endDate) {
				setError("Repeat until date is required.");
				return;
			}
			if (parseLocalDate(endDate) < parseLocalDate(startDate)) {
				setError("End date must be on or after start date.");
				return;
			}
		}
		if (previewDates.length === 0) {
			setError("No matching dates found in the selected range.");
			return;
		}

		setSaving(true);
		try {
			await createPractices({
				dates: previewDates,
				notes: notes.trim() || undefined,
			});
			const count = previewDates.length;
			toast.success(`${count} practice${count > 1 ? "s" : ""} added`);
			onSaved(previewDates.length);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to create practices.",
			);
			setSaving(false);
		}
	};

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent title="Add Practice" subtitle="Schedule">
				<div className="px-6 py-5 space-y-5">
					{/* Start date */}
					<Input
						label={isRecurring ? "Start date" : "Date"}
						type="date"
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
					/>

					{/* Recurring toggle */}
					<div className="flex items-center justify-between">
						<span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40]">
							Recurring
						</span>
						<button
							type="button"
							onClick={() => {
								setIsRecurring((v) => !v);
								if (!isRecurring && startDate) {
									// Pre-select the day of week matching start date
									const day = parseLocalDate(startDate).getDay();
									setSelectedDays([day]);
								}
							}}
							className={cn(
								"relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
								isRecurring ? "bg-[#298a29]" : "bg-[#cbdbcc]",
							)}
						>
							<span
								className={cn(
									"inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
									isRecurring ? "translate-x-6" : "translate-x-1",
								)}
							/>
						</button>
					</div>

					{isRecurring && (
						<>
							{/* Day of week selector */}
							<div>
								<p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40] mb-2">
									Repeat on
								</p>
								<div className="flex gap-1.5">
									{DAYS.map(({ label, value }) => (
										<button
											key={value}
											type="button"
											onClick={() => toggleDay(value)}
											className={cn(
												"flex-1 h-9 text-xs font-semibold border transition-colors",
												selectedDays.includes(value)
													? "bg-[#021e00] text-[#eef4f1] border-[#021e00]"
													: "bg-white text-[#4a8a40] border-[#cbdbcc] hover:border-[#298a29]",
											)}
										>
											{label}
										</button>
									))}
								</div>
							</div>

							{/* End date */}
							<Input
								label="Repeat until"
								type="date"
								value={endDate}
								min={startDate}
								onChange={(e) => setEndDate(e.target.value)}
							/>

							{/* Preview count */}
							{previewDates.length > 0 && (
								<p className="text-xs text-[#4a8a40]">
									Creates{" "}
									<span className="font-semibold">{previewDates.length}</span>{" "}
									{previewDates.length === 1 ? "practice" : "practices"}
								</p>
							)}
						</>
					)}

					{/* Notes */}
					<Input
						label="Notes"
						hint="optional"
						type="text"
						placeholder="e.g. Monday drop-in"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
					/>

					{error && <p className="text-xs text-red-500">{error}</p>}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} className="flex-1">
						Cancel
					</Button>
					<Button onClick={handleSave} loading={saving} className="flex-1">
						{isRecurring && previewDates.length > 1
							? `Add ${previewDates.length} Practices`
							: "Add Practice"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
