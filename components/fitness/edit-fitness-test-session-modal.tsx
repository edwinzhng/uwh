"use client";

import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDateInputValue, parseDateInputValue } from "@/lib/fitness";

type FitnessSession = {
	_id: Id<"fitnessTestSessions">;
	date: number;
};

interface EditFitnessTestSessionModalProps {
	fitnessTestId: Id<"fitnessTests">;
	onClose: () => void;
	onDeleted?: () => void;
	onSaved: (sessionId: Id<"fitnessTestSessions">) => void;
	session?: FitnessSession;
}

export const EditFitnessTestSessionModal = ({
	fitnessTestId,
	onClose,
	onDeleted,
	onSaved,
	session,
}: EditFitnessTestSessionModalProps): React.JSX.Element => {
	const [date, setDate] = useState(
		formatDateInputValue(session?.date ?? Date.now()),
	);
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const [error, setError] = useState<string>();
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		setConfirmingDelete(false);
		setDate(formatDateInputValue(session?.date ?? Date.now()));
		setError(undefined);
	}, [session]);

	const createFitnessTestSession = useMutation(
		api.fitnessTests.createFitnessTestSession,
	);
	const updateFitnessTestSession = useMutation(
		api.fitnessTests.updateFitnessTestSession,
	);
	const deleteFitnessTestSession = useMutation(
		api.fitnessTests.deleteFitnessTestSession,
	);

	const handleSave = async (): Promise<void> => {
		setSaving(true);
		setError(undefined);

		try {
			if (session) {
				const sessionId = await updateFitnessTestSession({
					date: parseDateInputValue(date),
					sessionId: session._id,
				});
				onSaved(sessionId);
				return;
			}

			const sessionId = await createFitnessTestSession({
				date: parseDateInputValue(date),
				fitnessTestId,
			});
			onSaved(sessionId);
		} catch (error) {
			setError(
				error instanceof Error ? error.message : "Unable to save session",
			);
			setSaving(false);
		}
	};

	const handleDelete = async (): Promise<void> => {
		if (!session) return;

		setDeleting(true);
		setError(undefined);

		try {
			await deleteFitnessTestSession({
				sessionId: session._id,
			});
			setConfirmingDelete(false);
			onDeleted?.();
		} catch (error) {
			setError(
				error instanceof Error ? error.message : "Unable to delete session",
			);
			setDeleting(false);
		}
	};

	return (
		<>
			<Dialog open onOpenChange={(open) => !open && onClose()}>
				<DialogContent
					subtitle="Session"
					title={session ? "Edit Session" : "New Session"}
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
								label="Session Date"
								type="date"
								value={date}
								onChange={(event) => setDate(event.target.value)}
							/>
						</div>
						<DialogFooter>
							<div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
								<div>
									{session ? (
										<Button
											type="button"
											className="h-auto px-0 text-red-600 underline underline-offset-2 hover:bg-transparent hover:text-red-700"
											variant="ghost"
											onClick={() => setConfirmingDelete(true)}
										>
											Delete
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
			{confirmingDelete ? (
				<Dialog
					open
					onOpenChange={(open) => {
						if (!open && !deleting) {
							setConfirmingDelete(false);
						}
					}}
				>
					<DialogContent title="Delete Session?">
						<div className="px-6 py-5">
							<p className="text-sm text-[#021e00]">
								This will permanently delete the session and all recorded
								results for it.
							</p>
						</div>
						<DialogFooter>
							<div className="flex w-full justify-end gap-2">
								<Button
									type="button"
									disabled={deleting}
									variant="outline"
									onClick={() => setConfirmingDelete(false)}
								>
									Cancel
								</Button>
								<Button
									type="button"
									loading={deleting}
									variant="destructive"
									onClick={() => void handleDelete()}
								>
									Delete
								</Button>
							</div>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			) : null}
		</>
	);
};
