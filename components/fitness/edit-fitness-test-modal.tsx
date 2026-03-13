"use client";

import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
	fitnessTestUnitLabels,
	fitnessTestUnitOptions,
	fitnessTestUnits,
} from "@/lib/fitness";

export type FitnessTest = Doc<"fitnessTests">;

interface EditFitnessTestModalProps {
	fitnessTest?: FitnessTest;
	onArchived?: () => void;
	onClose: () => void;
	onSaved: (fitnessTestId: Id<"fitnessTests">) => void;
}

export const EditFitnessTestModal = ({
	fitnessTest,
	onArchived,
	onClose,
	onSaved,
}: EditFitnessTestModalProps): React.JSX.Element => {
	const [confirmingArchive, setConfirmingArchive] = useState(false);
	const [name, setName] = useState(fitnessTest?.name ?? "");
	const [error, setError] = useState<string>();
	const [saving, setSaving] = useState(false);
	const [archiving, setArchiving] = useState(false);
	const [unit, setUnit] = useState(fitnessTest?.unit ?? fitnessTestUnits.TIME);

	useEffect(() => {
		setConfirmingArchive(false);
		setName(fitnessTest?.name ?? "");
		setUnit(fitnessTest?.unit ?? fitnessTestUnits.TIME);
		setError(undefined);
	}, [fitnessTest]);

	const createFitnessTest = useMutation(api.fitnessTests.createFitnessTest);
	const updateFitnessTest = useMutation(api.fitnessTests.updateFitnessTest);
	const archiveFitnessTest = useMutation(api.fitnessTests.archiveFitnessTest);

	const handleSave = async (): Promise<void> => {
		const trimmedName = name.trim();
		if (!trimmedName) {
			setError("Name is required");
			return;
		}

		setSaving(true);
		setError(undefined);

		try {
			if (fitnessTest) {
				await updateFitnessTest({
					id: fitnessTest._id,
					name: trimmedName,
				});
				onSaved(fitnessTest._id);
				return;
			}

			const createdFitnessTestId = await createFitnessTest({
				name: trimmedName,
				unit,
			});
			onSaved(createdFitnessTestId);
		} catch (error) {
			setError(
				error instanceof Error ? error.message : "Unable to save fitness test",
			);
			setSaving(false);
		}
	};

	const handleArchive = async (): Promise<void> => {
		if (!fitnessTest) return;

		setArchiving(true);
		setError(undefined);

		try {
			await archiveFitnessTest({
				id: fitnessTest._id,
			});
			setConfirmingArchive(false);
			onArchived?.();
		} catch {
			setError("Unable to archive fitness test");
			setArchiving(false);
		}
	};

	return (
		<>
			<Dialog open onOpenChange={(open) => !open && onClose()}>
				<DialogContent
					subtitle="Test Definition"
					title={fitnessTest ? "Edit Fitness Test" : "New Fitness Test"}
				>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							void handleSave();
						}}
					>
						<div className="px-6 py-5">
							<Input
								autoFocus
								error={error}
								label="Test Name"
								value={name}
								onChange={(event) => setName(event.target.value)}
							/>
							<div className="mt-5">
								<label
									htmlFor="fitness-test-unit"
									className="mb-1.5 block text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a8a40]"
								>
									Unit
								</label>
								{fitnessTest ? (
									<div className="flex h-11 items-center border border-[#cbdbcc] bg-[#f8faf9] px-3 text-sm text-[#021e00]">
										{fitnessTestUnitLabels[fitnessTest.unit]}
									</div>
								) : (
									<select
										id="fitness-test-unit"
										value={unit}
										onChange={(event) => {
											const selectedUnit = fitnessTestUnitOptions.find(
												(option) => option.value === event.target.value,
											);
											setUnit(selectedUnit?.value ?? fitnessTestUnits.TIME);
										}}
										className="h-11 w-full border border-[#cbdbcc] bg-white px-3 text-sm text-[#021e00] focus:border-[#298a29] focus:outline-none"
									>
										{fitnessTestUnitOptions.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
								)}
							</div>
						</div>
						<DialogFooter>
							<div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
								<div>
									{fitnessTest ? (
										<Button
											type="button"
											className="h-auto px-0 text-red-600 underline underline-offset-2 hover:bg-transparent hover:text-red-700"
											variant="ghost"
											onClick={() => setConfirmingArchive(true)}
										>
											Archive
										</Button>
									) : null}
								</div>
								<div className="flex gap-2 md:justify-end">
									<Button type="button" variant="outline" onClick={onClose}>
										Cancel
									</Button>
									<Button type="submit" loading={saving}>
										Save
									</Button>
								</div>
							</div>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
			{confirmingArchive ? (
				<Dialog
					open
					onOpenChange={(open) => {
						if (!open && !archiving) {
							setConfirmingArchive(false);
						}
					}}
				>
					<DialogContent title="Archive Test?">
						<div className="px-6 py-5">
							<p className="text-sm text-[#021e00]">
								This will archive the test and remove it from the active fitness
								test list.
							</p>
						</div>
						<DialogFooter>
							<div className="flex w-full justify-end gap-2">
								<Button
									type="button"
									disabled={archiving}
									variant="outline"
									onClick={() => setConfirmingArchive(false)}
								>
									Cancel
								</Button>
								<Button
									type="button"
									loading={archiving}
									variant="destructive"
									onClick={() => void handleArchive()}
								>
									Archive
								</Button>
							</div>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			) : null}
		</>
	);
};
