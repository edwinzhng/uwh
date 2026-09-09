import { useMutation, useQuery } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import {
	ActionMenu,
	Button,
	Dialog,
	Field,
	Row,
	Stack,
	Text,
} from "../design-system";
import { FitnessResultPage } from "./fitness-result-page";
import { FitnessSessionForm } from "./fitness-session-form";
import { useFitnessTask } from "./use-fitness-task";
export const FitnessResults = ({
	test,
	sessionId,
	onBack,
}: {
	test: Doc<"fitnessTests">;
	sessionId: Id<"fitnessSessions">;
	onBack: () => void;
}): ReactElement => {
	const session = useQuery(api.fitness.session, { sessionId });
	const [editing, setEditing] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [search, setSearch] = useState("");
	const [cursors, setCursors] = useState<string[]>([]);
	const [dirty, setDirty] = useState(false);
	const [version, setVersion] = useState(0);
	const remove = useMutation(api.fitness.deleteSession);
	const task = useFitnessTask();
	const cursor = cursors.at(-1);
	const page = useQuery(
		api.fitness.roster,
		session
			? {
					testId: test._id,
					seasonId: session.seasonId,
					sessionId,
					search,
					paginationOpts: { cursor: cursor ?? null, numItems: 25 },
				}
			: "skip",
	);
	if (!session) return <Text>Loading…</Text>;
	return (
		<Stack>
			<Row justify="between" wrap>
				<Button
					label={test.name}
					icon="arrowLeft"
					variant="ghost"
					isDisabled={dirty}
					onPress={onBack}
				/>
				<ActionMenu
					label="Session options"
					isDisabled={dirty || task.busy}
					groups={[
						{
							id: "session",
							items: [
								{
									id: "edit",
									label: "Edit session",
									isDisabled: test.archived,
									onSelect: (): void => setEditing(true),
								},
								{
									id: "delete",
									label: "Delete session",
									tone: "danger",
									onSelect: (): void => setDeleting(true),
								},
							],
						},
					]}
				/>
			</Row>
			<Text variant="h3">{session.date}</Text>
			{session.notes ? (
				<Text tone="secondary">{session.notes}</Text>
			) : undefined}
			<Field
				label="Find player"
				value={search}
				isDisabled={dirty}
				onValueChange={(value): void => {
					setSearch(value);
					setCursors([]);
				}}
				inputMode="search"
			/>
			{page ? (
				<FitnessResultPage
					key={`${cursor ?? "first"}:${search}:${version}`}
					test={test}
					session={session}
					rows={page.page}
					onDirty={setDirty}
					onSaved={(): void => {
						setDirty(false);
						setVersion((value) => value + 1);
					}}
				/>
			) : (
				<Text>Loading…</Text>
			)}
			<Row justify="between">
				<Button
					label="Previous"
					variant="secondary"
					isDisabled={!cursors.length || dirty}
					onPress={(): void => setCursors((values) => values.slice(0, -1))}
				/>
				<Button
					label="Next"
					variant="secondary"
					isDisabled={!page || page.isDone || dirty}
					onPress={(): void => {
						if (page) setCursors((values) => [...values, page.continueCursor]);
					}}
				/>
			</Row>
			{editing ? (
				<FitnessSessionForm
					testId={test._id}
					seasonId={session.seasonId}
					session={session}
					onClose={(): void => setEditing(false)}
					onSaved={(): void => {}}
				/>
			) : undefined}
			<Dialog
				title="Delete session?"
				isOpen={deleting}
				onOpenChange={(open): void => {
					if (!task.busy) setDeleting(open);
				}}
				footer={
					<Button
						label="Delete session"
						variant="danger"
						isLoading={task.busy}
						onPress={(): void => {
							void task.run(async () => {
								await remove({ sessionId, revision: session.revision });
								onBack();
							});
						}}
					/>
				}
			>
				<Text>All results from this session will be removed.</Text>
				{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
			</Dialog>
		</Stack>
	);
};
