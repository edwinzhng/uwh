import { type ReactElement, useState } from "react";
import { newId, useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	Field,
	Select,
	Stack,
	Tabs,
	Text,
} from "../design-system";
import { addDays } from "../domain/app-rules";
import { clubDate } from "../domain/event-time";
import {
	type ProgramCommand,
	programCommandPayload,
} from "../domain/program-command";
import {
	type ClubProgram,
	defaultProgramRsvp,
	type ProgramDraft,
	programDates,
	programDraft,
	validateProgram,
	validateProgramRsvp,
} from "../domain/programs";
import { ProgramRosterFields } from "./program-roster-fields";
import { ProgramRsvpFields } from "./program-rsvp-fields";
import { ProgramScheduleFields } from "./program-schedule-fields";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";

export const ProgramEditor = ({
	program,
	onClose,
	initialTab = "details",
}: {
	program?: ClubProgram;
	onClose: () => void;
	initialTab?: "details" | "roster" | "rsvp";
}): ReactElement => {
	const { data, dispatch } = useApp();
	const today = clubDate(undefined, data.timeZone);
	const [draft, setDraft] = useState<ProgramDraft>(
		() =>
			(program ? programDraft(program) : undefined) ?? {
				id: newId(),
				name: "",
				archived: false,
				status: "active",
				kind: "hockey",
				seasonId: data.seasons.find(
					(season) => season.start <= today && season.end >= today,
				)?.id,
				rsvp: defaultProgramRsvp(),
			},
	);
	const [memberIds, setMemberIds] = useState(() =>
		data.members
			.filter(
				(member) => member.programs.includes(draft.id) && !member.archived,
			)
			.map((member) => member.id),
	);
	const [tab, setTab] = useState(initialTab);
	const task = useFormTask();
	const operationKey = useOperationKey();
	const count = draft.schedule
		? programDates(draft.schedule).filter((date) => date >= today).length
		: 0;
	const save = async (): Promise<void> => {
		if (
			await task.submit(
				(): string | undefined => {
					const error = validateProgram(draft, data);
					if (error)
						setTab(validateProgramRsvp(draft.rsvp) ? "rsvp" : "details");
					return error;
				},
				async (): Promise<void> => {
					const action = {
						type: "save-program",
						draft,
						expectedRevision: program?.revision ?? 0,
						memberIds,
					} satisfies ProgramCommand;
					if (
						!(await dispatch({
							...action,
							requestId: operationKey(programCommandPayload(action)),
						}))
					)
						throw new Error("Could not save this program.");
				},
			)
		)
			onClose();
	};
	return (
		<Dialog
			intent="form"
			isDismissDisabled={task.busy}
			title={program ? `Edit ${program.name}` : "New program"}
			isOpen
			onOpenChange={(open): void => {
				if (!open && !task.busy) onClose();
			}}
			footer={
				<Button
					label="Save program"
					isLoading={task.busy}
					onPress={(): void => {
						void save();
					}}
				/>
			}
		>
			<Stack>
				<Tabs
					label="Program editor"
					value={tab}
					options={[
						{ value: "details", label: "Details" },
						{ value: "roster", label: "Roster" },
						{ value: "rsvp", label: "RSVP" },
					]}
					onValueChange={(value): void => {
						if (!task.busy) setTab(value);
					}}
				/>
				{tab === "details" ? (
					<>
						<Field
							label="Program name"
							value={draft.name}
							onValueChange={(name): void => setDraft({ ...draft, name })}
							isDisabled={task.busy}
						/>
						<Select
							label="Season"
							value={draft.seasonId ?? "none"}
							options={[
								{ value: "none", label: "No season" },
								...data.seasons.map((season) => ({
									value: season.id,
									label: season.name,
								})),
							]}
							onValueChange={(seasonId): void =>
								setDraft({
									...draft,
									seasonId: seasonId === "none" ? undefined : seasonId,
								})
							}
							isDisabled={task.busy}
						/>
						<Select
							label="Session type"
							value={draft.kind}
							options={[
								{ value: "training", label: "Training" },
								{ value: "hockey", label: "Practice / game" },
								{ value: "tournament", label: "Tournament" },
								{ value: "social", label: "Social" },
								{ value: "meeting", label: "Meeting" },
							]}
							onValueChange={(kind): void => {
								if (kind) setDraft({ ...draft, kind });
							}}
							isDisabled={task.busy}
						/>
						<Select
							label="Status"
							value={draft.status}
							options={[
								{ value: "draft", label: "Draft" },
								{ value: "active", label: "Active" },
								{ value: "completed", label: "Completed" },
							]}
							onValueChange={(status): void => {
								if (status) setDraft({ ...draft, status });
							}}
							isDisabled={task.busy}
						/>
						<ProgramScheduleFields
							value={draft.schedule}
							initial={{
								startDate: today,
								endDate: addDays(today, 28),
								weekday: new Date(`${today}T12:00:00Z`).getUTCDay() || 7,
								start: "19:00",
								end: "20:30",
								venue: data.venues?.at(0) ?? "",
							}}
							onChange={(schedule): void => setDraft({ ...draft, schedule })}
							disabled={task.busy}
						/>
						{draft.schedule ? (
							<Text variant="small" tone="secondary">
								{count} future weekly dates. Existing dates are not duplicated.
								Past and individually edited sessions stay unchanged. Removed
								future program dates are cancelled, not deleted.
							</Text>
						) : undefined}
					</>
				) : tab === "roster" ? (
					<ProgramRosterFields
						members={data.members}
						value={memberIds}
						onChange={setMemberIds}
						disabled={task.busy}
					/>
				) : (
					<ProgramRsvpFields
						value={draft.rsvp}
						onChange={(rsvp): void => setDraft({ ...draft, rsvp })}
						disabled={task.busy}
					/>
				)}
				{task.error ? (
					<Text tone="danger" variant="small">
						{task.error}
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
