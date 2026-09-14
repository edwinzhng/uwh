import { lazy, type ReactElement, Suspense, useState } from "react";
import { View } from "react-native";
import { reactionChoices } from "../domain/messaging";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { typography } from "./tokens";
import { useControlSize } from "./use-control-size";

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
	const size = useControlSize();
	return (
		<>
			<View style={{ height: typography.caption.lineHeight, width: size }}>
				<View
					style={{
						position: "absolute",
						top: (typography.caption.lineHeight - size) / 2,
					}}
				>
					<Button
						label="Add reaction"
						icon="reaction"
						variant="ghost"
						isDisabled={isDisabled}
						onPress={(): void => setOpen(true)}
					/>
				</View>
			</View>
			<Dialog isOpen={open} onOpenChange={setOpen} title="React" footer={false}>
				<Stack gap="sm">
					<Row gap="xs" justify="center">
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
