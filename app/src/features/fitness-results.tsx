import { type ReactElement, useState } from "react";
import { useFitnessActions } from "../backend/fitness-actions";
import { FitnessData } from "../backend/fitness-data";
import {
	ActionMenu,
	Button,
	Dialog,
	Field,
	InfiniteScroll,
	LoadingContent,
	Row,
	Stack,
	Text,
} from "../design-system";
import type { FitnessTest } from "../domain/fitness-model";
import { FitnessResultPage } from "./fitness-result-page";
import { FitnessSessionForm } from "./fitness-session-form";
import { useTask } from "./use-task";
export const FitnessResults = ({
	test,
	sessionId,
	onBack,
}: {
	test: FitnessTest;
	sessionId: string;
	onBack: () => void;
}): ReactElement => {
	const [editing, setEditing] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [search, setSearch] = useState("");
	const [dirtyPage, setDirtyPage] = useState<string>();
	const dirty = dirtyPage !== undefined;
	const [version, setVersion] = useState(0);
	const remove = useFitnessActions().deleteSession;
	const task = useTask();
	return (
		<FitnessData
			request={{ type: "results", testId: test._id, sessionId, search }}
		>
			{({ session, roster: page }) =>
				!session ? (
					<LoadingContent />
				) : (
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
						<Text variant="h4">{session.date}</Text>
						{session.notes ? (
							<Text tone="secondary">{session.notes}</Text>
						) : undefined}
						<Field
							label="Find player"
							value={search}
							isDisabled={dirty}
							onValueChange={(value): void => {
								setSearch(value);
							}}
							inputMode="search"
						/>
						{page ? (
							page.page.length ? (
								Array.from(
									{ length: Math.ceil(page.page.length / 25) },
									(_, index) => page.page.slice(index * 25, (index + 1) * 25),
								).map((rows) => {
									const id = rows.at(0)?.personId ?? "empty";
									return (
										<FitnessResultPage
											key={`${id}:${rows.length}:${search}:${version}`}
											test={test}
											session={session}
											rows={rows}
											disabled={
												page.loadingMore ||
												(dirtyPage !== undefined && dirtyPage !== id)
											}
											onDirty={(value): void =>
												setDirtyPage(value ? id : undefined)
											}
											onSaved={(): void => {
												setDirtyPage(undefined);
												setVersion((value) => value + 1);
											}}
										/>
									);
								})
							) : (
								<FitnessResultPage
									test={test}
									session={session}
									rows={[]}
									onDirty={(): void => {}}
									onSaved={(): void => {}}
								/>
							)
						) : (
							<LoadingContent />
						)}
						<InfiniteScroll
							loadMore={
								page && !page.isDone && !page.loadingMore
									? (): void => page.loadMore(25)
									: undefined
							}
							loading={page?.loadingMore}
							revision={page?.page.length}
							disabled={dirty}
						/>
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
							intent="confirmation"
							isDismissDisabled={task.busy}
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
				)
			}
		</FitnessData>
	);
};
