import { lazy, type ReactElement, Suspense, useState } from "react";
import { reactionChoices } from "../domain/messaging";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";

const EmojiPicker = lazy(async () => ({
	default: (await import("./emoji-picker")).EmojiPicker,
}));

export const ReactionPicker = ({
	onSelect,
	isDisabled,
}: {
	onSelect: (emoji: string) => void;
	isDisabled?: boolean;
}): ReactElement => {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button
				label="Add reaction"
				icon="reaction"
				variant="ghost"
				isDisabled={isDisabled}
				onPress={(): void => setOpen(true)}
			/>
			<Dialog isOpen={open} onOpenChange={setOpen} title="React" footer={false}>
				<Stack gap="sm">
					<Row gap="xxs">
						{reactionChoices.map((choice) => (
							<Button
								key={choice.emoji}
								label={choice.emoji}
								accessibilityLabel={choice.label}
								variant="ghost"
								onPress={(): void => {
									onSelect(choice.emoji);
									setOpen(false);
								}}
							/>
						))}
					</Row>
					{open ? (
						<Suspense fallback={<Text variant="caption">Loading emoji…</Text>}>
							<EmojiPicker
								onSelect={(emoji): void => {
									onSelect(emoji);
									setOpen(false);
								}}
							/>
						</Suspense>
					) : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
