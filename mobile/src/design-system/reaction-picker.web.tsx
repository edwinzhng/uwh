import { Popover } from "@base-ui/react/popover";
import { lazy, type ReactElement, Suspense, useState } from "react";
import { reactionChoices } from "../domain/messaging";
import { Button } from "./button";
import { Icon } from "./icon";
import { usePopupContainer } from "./popup-container";
import { Row } from "./row";
import { Text } from "./text";
import { space } from "./tokens";

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
	const container = usePopupContainer();
	const choose = (emoji: string): void => {
		onSelect(emoji);
		setOpen(false);
	};
	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger
				className="club-combo-action"
				aria-label="Add reaction"
				disabled={isDisabled}
			>
				<Icon name="reaction" size="sm" />
			</Popover.Trigger>
			<Popover.Portal container={container}>
				<Popover.Positioner
					className="club-popup-positioner"
					align="start"
					side="top"
					sideOffset={space.xxs}
					collisionPadding={space.xs}
				>
					<Popover.Popup
						className="club-popup"
						data-club-popup
						aria-label="React"
						style={{
							width: "max-content",
							maxHeight: "var(--available-height)",
							overflowY: "auto",
						}}
					>
						<Row gap="xxs" justify="between">
							{reactionChoices.map((choice) => (
								<Button
									key={choice.emoji}
									label={choice.emoji}
									accessibilityLabel={choice.label}
									variant="ghost"
									onPress={(): void => choose(choice.emoji)}
								/>
							))}
						</Row>
						{open ? (
							<Suspense
								fallback={<Text variant="caption">Loading emoji…</Text>}
							>
								<EmojiPicker onSelect={choose} />
							</Suspense>
						) : undefined}
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
};
