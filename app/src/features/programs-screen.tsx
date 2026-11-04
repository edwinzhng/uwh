import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	ActionMenu,
	Badge,
	Button,
	Dialog,
	EmptyState,
	NavigationCard,
	Stack,
	Tabs,
	Text,
} from "../design-system";
import {
	type ProgramCommand,
	programCommandPayload,
} from "../domain/program-command";
import {
	type ClubProgram,
	clubPrograms,
	programDraft,
} from "../domain/programs";
import { ClubShell } from "./club-shell";
import { ProgramEditor } from "./program-editor";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";
import { useReviewFlow } from "./use-review-flow";

export const ProgramsScreen = (): ReactElement => {
	const { data, account, dispatch } = useApp();
	const review = useReviewFlow();
	const [editing, setEditing] = useState<ClubProgram | "new" | undefined>(() =>
		review === "program-create"
			? "new"
			: review === "program-roster" || review === "program-rsvp"
				? clubPrograms(data).at(0)
				: undefined,
	);
	const [filter, setFilter] = useState<"active" | "archived">("active");
	const [deleting, setDeleting] = useState<ClubProgram>();
	const task = useFormTask();
	const operationKey = useOperationKey();
	const programs = clubPrograms(data).filter(
		(program) => program.archived === (filter === "archived"),
	);
	const archive = async (program: ClubProgram): Promise<void> => {
		await task.run(async (): Promise<void> => {
			const action: ProgramCommand = {
				type: "save-program",
				draft: { ...programDraft(program), archived: !program.archived },
				expectedRevision: program.revision,
				memberIds: data.members
					.filter(
						(member) =>
							!member.archived && member.programs.includes(program.id),
					)
					.map((member) => member.id),
			};
			if (
				!(await dispatch({
					...action,
					requestId: operationKey(programCommandPayload(action)),
				}))
			)
				throw new Error("Could not update this program.");
		});
	};
	return (
		<ClubShell
			title="Programs"
			actionPlacement="inline"
			action={
				account.admin ? (
					<Button
						label="New program"
						prefix="plus"
						onPress={(): void => setEditing("new")}
					/>
				) : undefined
			}
		>
			<Stack>
				<Tabs
					label="Programs"
					value={filter}
					options={[
						{ value: "active", label: "Active" },
						{ value: "archived", label: "Archived" },
					]}
					onValueChange={setFilter}
				/>
				{programs.map((program) => (
					<NavigationCard
						key={program.id}
						title={program.name}
						icon="layers"
						label={account.admin ? `Edit ${program.name}` : program.name}
						description={`${data.members.filter((member) => !member.archived && member.programs.includes(program.id)).length} members · ${program.schedule ? `${program.schedule.start}–${program.schedule.end} · ${program.schedule.venue}` : "No standing schedule"}`}
						onPress={(): void => {
							if (account.admin) setEditing(program);
						}}
						trailing={
							<Badge label={program.archived ? "Archived" : program.status} />
						}
						accessory={
							account.admin ? (
								<ActionMenu
									label={`Actions for ${program.name}`}
									icon="more"
									groups={[
										{
											id: "program",
											items: [
												{
													id: "edit",
													label: "Edit program",
													onSelect: (): void => setEditing(program),
												},
												{
													id: "archive",
													label: program.archived ? "Restore" : "Archive",
													onSelect: (): void => {
														void archive(program);
													},
													isDisabled: task.busy,
												},
												{
													id: "delete",
													label: "Delete unused program",
													tone: "danger",
													onSelect: (): void => {
														task.clear();
														setDeleting(program);
													},
													isDisabled: task.busy,
												},
											],
										},
									]}
								/>
							) : undefined
						}
					/>
				))}
				{!programs.length ? (
					<EmptyState
						title={
							filter === "archived" ? "No archived programs" : "No programs"
						}
					/>
				) : undefined}
				{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
			</Stack>

			{editing ? (
				<ProgramEditor
					program={editing === "new" ? undefined : editing}
					onClose={(): void => setEditing(undefined)}
					initialTab={
						editing !== "new" && review === "program-roster"
							? "roster"
							: editing !== "new" && review === "program-rsvp"
								? "rsvp"
								: "details"
					}
				/>
			) : undefined}
			<Dialog
				intent="confirmation"
				isDismissDisabled={task.busy}
				title={`Delete ${deleting?.name ?? "program"}?`}
				isOpen={Boolean(deleting)}
				onOpenChange={(open): void => {
					if (!open && !task.busy) setDeleting(undefined);
				}}
				footer={
					<Button
						label="Delete unused program"
						variant="danger"
						isLoading={task.busy}
						onPress={(): void => {
							if (!deleting) return;
							void task.run(async (): Promise<void> => {
								if (
									!(await dispatch({
										type: "delete-program",
										id: deleting.id,
										expectedRevision: deleting.revision,
									}))
								)
									throw new Error(
										"Linked programs cannot be deleted. Archive the program instead.",
									);
								setDeleting(undefined);
							});
						}}
					/>
				}
			>
				<Stack>
					<Text>
						Only unused programs can be deleted. Programs linked to members,
						sessions, notices, trackers or coaching permissions must be archived
						so their history stays intact.
					</Text>
					{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
				</Stack>
			</Dialog>
		</ClubShell>
	);
};
