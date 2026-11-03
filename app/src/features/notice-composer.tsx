import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	DatePicker,
	Dialog,
	Field,
	Select,
	Stack,
	Text,
} from "../design-system";
import type { Notice } from "../domain/app-types";
import { addDays } from "../domain/calendar-dates";
import {
	canManageNotice,
	defaultNoticeExpiry,
	validateNoticeDraft,
} from "../domain/notices";
import { programName, programOptions } from "../domain/programs";
import { ConfirmationDialog } from "./confirmation-dialog";
import { useClubToday } from "./use-club-today";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";

export const NoticeComposer = ({
	notice,
	onClose,
}: {
	notice?: Notice;
	onClose: () => void;
}): ReactElement => {
	const { account, data, dispatch, source, workspaceId } = useApp();
	const today = useClubToday();
	const task = useFormTask();
	const operationKey = useOperationKey();
	const audiences = [
		...(account.admin ? [{ value: "all", label: "Everyone" }] : []),
		...programOptions(data).filter(
			(option) => account.admin || account.coachPrograms.includes(option.value),
		),
	];
	const [initial] = useState(() => ({
		body: notice?.body ?? "",
		expiresAt: notice ? notice.expiresAt : defaultNoticeExpiry(today),
		program: notice?.program ?? audiences.at(0)?.value ?? "",
		date: today,
	}));
	const [body, setBody] = useState(initial.body);
	const [expiresAt, setExpiresAt] = useState(initial.expiresAt);
	const [program, setProgram] = useState(initial.program);
	const [discarding, setDiscarding] = useState(false);
	const authorized = notice
		? canManageNotice(account, notice)
		: audiences.length > 0;
	const changed =
		body !== initial.body ||
		expiresAt !== initial.expiresAt ||
		program !== initial.program;
	const requestClose = (): void => {
		if (task.busy) return;
		if (changed) setDiscarding(true);
		else onClose();
	};
	const save = async (): Promise<void> => {
		await task.submit(
			() =>
				!authorized
					? "You don’t have access to publish this announcement."
					: !notice && !audiences.some((option) => option.value === program)
						? "Choose an audience."
						: validateNoticeDraft(
								{ body, expiresAt },
								today,
								Boolean(notice && notice.expiresAt === undefined),
							),
			async (): Promise<void> => {
				const value = { body: body.trim(), expiresAt, program };
				const saved = await dispatch(
					notice
						? {
								type: "edit-notice",
								noticeId: notice.id,
								body: value.body,
								expiresAt,
								expectedBody: notice.body,
								expectedExpiresAt: notice.expiresAt,
							}
						: {
								type: "create-notice",
								notice: {
									id: `notice-${operationKey(JSON.stringify({ source, workspaceId, actorId: account.id, date: initial.date, ...value }))}`,
									title: "Announcement",
									...value,
									date: initial.date,
									acknowledgedBy: [],
								},
							},
				);
				if (!saved)
					throw new Error("Couldn’t save this announcement. Try again.");
				onClose();
			},
		);
	};
	return (
		<>
			<Dialog
				intent="form"
				isDismissDisabled={task.busy}
				title={notice ? "Edit announcement" : "New announcement"}
				isOpen={!discarding}
				onOpenChange={(open): void => {
					if (!open) requestClose();
				}}
				footer={
					<Button
						label={notice ? "Save" : "Publish"}
						isLoading={task.busy}
						isDisabled={!authorized}
						onPress={(): void => {
							void save();
						}}
					/>
				}
			>
				<Stack>
					{notice ? (
						<Text variant="small" tone="secondary">
							{programName(data, notice.program)}
						</Text>
					) : (
						<Select
							label="Audience"
							value={program}
							options={audiences}
							isDisabled={task.busy}
							onValueChange={(value): void => setProgram(value ?? "")}
						/>
					)}
					<Field
						label="Message"
						placeholder="What does the club need to know?"
						value={body}
						onValueChange={setBody}
						multiline
						rows={4}
						maxLength={500}
						isDisabled={task.busy || !authorized}
					/>
					<DatePicker
						label="End date"
						value={expiresAt}
						min={addDays(today, 1)}
						isDisabled={task.busy || !authorized}
						onValueChange={(value): void =>
							setExpiresAt(
								value ??
									(notice ? initial.expiresAt : defaultNoticeExpiry(today)),
							)
						}
					/>
					{!authorized ? (
						<Text tone="danger">
							You don’t have access to publish this announcement.
						</Text>
					) : task.error ? (
						<Text tone="danger">{task.error}</Text>
					) : undefined}
				</Stack>
			</Dialog>
			{discarding ? (
				<ConfirmationDialog
					title="Discard announcement changes?"
					description="Your unsaved changes will be lost."
					confirmLabel="Discard changes"
					danger
					onClose={(): void => setDiscarding(false)}
					onConfirm={async (): Promise<void> => onClose()}
				/>
			) : undefined}
		</>
	);
};
