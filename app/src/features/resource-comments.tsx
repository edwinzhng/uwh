import { type ReactElement, useState } from "react";
import type { ResourceState } from "../backend/use-resources";
import { useApp } from "../demo/app-state";
import {
	Button,
	Field,
	List,
	ListItem,
	Row,
	SectionHeading,
	Stack,
	Text,
} from "../design-system";
import { displayDateTime } from "../domain/date-display";
import {
	type Resource,
	type ResourceComment,
	validateResourceComment,
} from "../domain/resources";
import { ConfirmButton } from "./confirm-button";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";

export const ResourceComments = ({
	resource,
	comments,
	limited,
	canManage,
	state,
}: {
	resource: Resource;
	comments: ResourceComment[];
	limited: boolean;
	canManage: boolean;
	state: ResourceState;
}): ReactElement => {
	const { account, data } = useApp();
	const task = useFormTask();
	const [body, setBody] = useState("");
	const [submission, setSubmission] = useState(0);
	const operationKey = useOperationKey();
	const submit = async (): Promise<void> => {
		if (
			await task.submit(
				() => validateResourceComment(body),
				async (): Promise<void> =>
					state.comment(
						resource.id,
						body.trim(),
						operationKey(
							JSON.stringify({
								resourceId: resource.id,
								actorId: account.id,
								body: body.trim(),
								submission,
							}),
						),
					),
			)
		) {
			setBody("");
			setSubmission((value) => value + 1);
		}
	};
	return (
		<Stack gap="heading">
			<SectionHeading>Comments</SectionHeading>
			{!resource.archived ? (
				<Stack gap="sm">
					<Field
						label="Comment"
						value={body}
						onValueChange={setBody}
						multiline
						rows={2}
						maxLength={2000}
						isDisabled={task.busy}
					/>
					<Row justify="end">
						<Button
							label="Post comment"
							compact
							isLoading={task.busy}
							onPress={(): void => {
								void submit();
							}}
						/>
					</Row>
				</Stack>
			) : undefined}
			{comments.length ? (
				<List>
					{comments.map((comment) => (
						<ListItem
							key={comment.id}
							title={comment.authorName}
							titleAccessory={
								<Text variant="caption" tone="secondary">
									{displayDateTime(comment.createdAt, data.timeZone)}
								</Text>
							}
							description={comment.body}
							trailing={
								comment.authorId === account.id || canManage ? (
									<ConfirmButton
										label="Remove comment"
										icon="trash"
										title="Remove comment?"
										description="Remove this comment from the resource discussion."
										confirmLabel="Remove comment"
										danger
										variant="ghost"
										isDisabled={task.busy}
										onConfirm={(): Promise<boolean> =>
											task.run(() => state.removeComment(comment.id))
										}
									/>
								) : undefined
							}
						/>
					))}
				</List>
			) : undefined}
			{limited ? (
				<Text variant="caption" tone="secondary">
					Showing the latest 100 comments.
				</Text>
			) : undefined}
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
		</Stack>
	);
};
