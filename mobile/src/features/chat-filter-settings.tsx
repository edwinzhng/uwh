import { useMutation, useQuery } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import {
	Button,
	Dialog,
	Field,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { useTask } from "./use-task";

export const ChatFilterSettings = (): ReactElement => {
	const phrases = useQuery(api.chat_policy.current, {});
	const save = useMutation(api.chat_policy.save);
	const task = useTask();
	const [open, setOpen] = useState(false);
	const [text, setText] = useState("");
	return (
		<Stack gap="sm">
			<SectionHeading>Message filter</SectionHeading>
			<Surface>
				<Stack>
					<Button
						label="Edit blocked phrases"
						variant="secondary"
						onPress={(): void => {
							setText(phrases?.join("\n") ?? "");
							setOpen(true);
							task.clear();
						}}
					/>
					<Dialog
						title="Blocked phrases"
						staffRole="admin"
						isOpen={open}
						onOpenChange={setOpen}
						footer={
							<Button
								label="Save"
								isLoading={task.busy}
								onPress={(): void => {
									void task.run(async (): Promise<void> => {
										await save({ phrases: text.split("\n") });
										setOpen(false);
									});
								}}
							/>
						}
					>
						<Stack>
							<Field
								label="One phrase per line"
								value={text}
								onValueChange={setText}
								multiline
								maxLength={8000}
							/>
							<Text variant="small" tone="secondary">
								Matching messages and edits can’t be sent.
							</Text>
							{task.error ? (
								<Text variant="small" tone="danger">
									{task.error}
								</Text>
							) : undefined}
						</Stack>
					</Dialog>
				</Stack>
			</Surface>
		</Stack>
	);
};
